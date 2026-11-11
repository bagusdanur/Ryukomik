import { NextResponse } from "next/server";

import { adminErrorResponse, verifyAdminRequest } from "@/lib/adminApi";
import { projectApiFetch } from "@/lib/projectApiServer";
import { notifyScanlator } from "@/lib/scanlatorNotify";
import { socialQuery } from "@/lib/social/db";
import { logChapterRevision } from "@/lib/scanlatorAudit";
import { CHAPTER_BANNER_URL } from "@/lib/chapterBanner";
import { withChapterBannerMerged } from "@/lib/chapterBannerMerge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PendingChapter = {
  id: string;
  chapter_number: number;
  title: string | null;
  pages: number;
  is_published: boolean;
  review_status: string;
  pending_pages: number;
  review_note?: string | null;
};

/**
 * Review Scanlator — SERI dan CHAPTER disetujui terpisah.
 * - approve_series / reject_series
 * - approve_chapter / reject_chapter (per chapter)
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

    // Satu request ke project-db (bukan N+1 per project) dan tanpa batas 100
    // project: dulu seri di halaman berikutnya tidak pernah muncul di antrean,
    // dan satu fetch chapter yang gagal membuat seri tampak "tanpa chapter".
    // Hitungan `pages`/`pending_pages` sudah mengecualikan banner Scanlator.
    const data = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>(
      `/admin/review-queue?banner=${encodeURIComponent(CHAPTER_BANNER_URL)}`,
    );

    const works = (data.data || []).map((raw) => {
      const m = raw as Record<string, unknown>;
      const chapterRows = Array.isArray(m.chapters) ? (m.chapters as Array<Record<string, unknown>>) : [];

      const chapters: PendingChapter[] = chapterRows
        .map((c) => ({
          id: String(c.id || ""),
          chapter_number: Number(c.chapter_number || 0),
          title: ((c.title ?? null) as string | null),
          pages: Number(c.pages || 0),
          is_published: Boolean(c.is_published),
          review_status: String(c.review_status || "approved"),
          pending_pages: Number(c.pending_pages || 0),
          review_note: ((c.review_note ?? null) as string | null),
        }))
        .sort((a, b) => a.chapter_number - b.chapter_number);

      const pendingChapters = chapters.filter((c) => !c.is_published);

      return {
        id: String(m.id || ""),
        slug: String(m.slug || ""),
        title: String(m.title || ""),
        cover_url: (m.cover_url as string | null) || null,
        type: (m.type as string | null) || null,
        is_adult: Boolean(m.is_adult),
        scanlator_handle: (m.scanlator_handle as string | null) || null,
        scanlator_team: (m.scanlator_team as string | null) || null,
        chapters,
        pendingChapters,
        revisions: chapters.filter((c) => c.is_published && c.review_status === "pending"),
        review_status: (m.review_status as string | null) || null,
        review_note: (m.review_note as string | null) || null,
      };
    });

    const filtered = works.filter(
      (w) =>
        w.review_status === "pending" ||
        (w.pendingChapters?.length ?? 0) > 0 ||
        (w.revisions?.length ?? 0) > 0,
    );

    return NextResponse.json({ success: true, works: filtered }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memuat antrean review.");
  }
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const body = (await request.json().catch(() => null)) as
      | { id?: string; chapter_id?: string; action?: string; note?: string }
      | null;
    const action = String(body?.action || "");
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) || null : null;

    // ── CHAPTER ──────────────────────────────────────────────────────────
    if (action === "approve_chapter" || action === "reject_chapter") {
      if (!body?.chapter_id || !body?.id) return NextResponse.json({ error: "Chapter atau seri tidak valid." }, { status: 400 });
      if (action === "reject_chapter" && !note) {
        return NextResponse.json({ error: "Alasan penolakan chapter wajib diisi." }, { status: 400 });
      }

      if (body.id) {
        const manga = await projectApiFetch<{ data?: Record<string, unknown> }>(`/admin/projects/${body.id}`).catch(() => null);
        if (!manga?.data) return NextResponse.json({ error: "Project tidak ditemukan." }, { status: 404 });
        if (String(manga.data.review_status || "") !== "approved") {
          return NextResponse.json({ error: "ACC seri lebih dulu sebelum menerbitkan chapter." }, { status: 409 });
        }

        // Publikasi chapter pertama sekaligus membuka seri. Endpoint project-db
        // menjalankan keduanya dalam satu transaksi agar seri tidak pernah tayang kosong.
        // Banner Scanlator ditempel di halaman terakhir saat terbit.
        const chapterDetail = await projectApiFetch<{ data?: { image_urls?: string[] } }>(`/admin/chapters/${body.chapter_id}`).catch(() => null);
        const sourceImages = Array.isArray(chapterDetail?.data?.image_urls)
          ? chapterDetail.data.image_urls.filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url))
          : [];
        // Jangan pernah menimpa halaman chapter dengan banner saja. Kalau detail
        // chapter gagal dimuat, `withChapterBanner(undefined)` menghasilkan array
        // berisi 1 banner → semua halaman asli hilang.
        if (action === "approve_chapter" && sourceImages.length === 0) {
          return NextResponse.json(
            { error: "Gagal memuat halaman chapter. Coba lagi sebelum menerbitkan." },
            { status: 409 },
          );
        }
        // Banner digabung ke bawah halaman terakhir supaya ikut saat chapter
        // di-mirror situs lain (mereka membuang gambar terakhir / beda host).
        const publishedImages = action === "approve_chapter" ? await withChapterBannerMerged(sourceImages) : null;
        await projectApiFetch(`/admin/chapters/${body.chapter_id}`, {
          method: "PATCH",
          body: JSON.stringify({
            is_published: action === "approve_chapter",
            publish_parent_if_first: action === "approve_chapter",
            // Simpan hasil keputusan di baris chapter: alasan tolak dulu hanya
            // ikut notifikasi sehingga tidak terlihat lagi setelah dibaca.
            review_status: action === "approve_chapter" ? "approved" : "rejected",
            review_note: action === "approve_chapter" ? null : note,
            ...(publishedImages ? { image_urls: publishedImages } : {}),
          }),
        });
        await logChapterRevision({
          chapterId: body.chapter_id,
          mangaSlug: String(manga?.data?.slug || ""),
          actorId: admin.userId,
          action: action === "approve_chapter" ? "approve" : "reject",
          after: { is_published: action === "approve_chapter", note },
        });
        const owner = manga?.data?.owner_user_id as string | undefined;

        // Notifikasi pembaca yang mengikuti grup — hanya saat chapter benar-benar terbit.
        if (action === "approve_chapter") {
          const teamHandle = String(manga?.data?.scanlator_handle || "").toLowerCase();
          if (teamHandle) {
            const chapterRows = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>(
              `/admin/chapters?manga_slug=${encodeURIComponent(String(manga?.data?.slug || ""))}&limit=200&page=1`,
            ).catch(() => ({ data: [] }));
            const chapter = (chapterRows.data || []).find((c) => (c as { id?: string }).id === body.chapter_id);
            const chNumber = Number((chapter as { chapter_number?: number } | undefined)?.chapter_number || 0);
            const teamName = String(manga?.data?.scanlator_team || manga?.data?.scanlator_handle || "Scanlator");
            const seriesTitle = String(manga?.data?.title || "");
            const link = `/komik/project/${String(manga?.data?.slug || "")}`;

            await socialQuery(
              `insert into scanlator_notifications (user_id, type, title, body, link)
               select f.user_id, 'info', $1, $2, $3
                 from scanlator_follows f
                where f.handle = $4 and f.notify = true and f.user_id <> $5
                limit 5000`,
              [
                `Chapter baru dari ${teamName}`,
                `${seriesTitle} · Ch. ${chNumber} sudah bisa dibaca.`,
                link,
                teamHandle,
                owner || "00000000-0000-0000-0000-000000000000",
              ],
            ).catch(() => undefined);
          }
        }

        if (owner) {
          await notifyScanlator(owner, {
            type: action === "approve_chapter" ? "project_approved" : "project_rejected",
            title:
              action === "approve_chapter"
                ? `Chapter terbit di “${String(manga?.data?.title || "")}”`
                : `Chapter ditolak di “${String(manga?.data?.title || "")}”`,
            body: action === "approve_chapter" ? "Chapter sudah bisa dibaca pembaca." : note,
            link: "/scanlator",
          });
        }
      }
      return NextResponse.json({ success: true, status: action });
    }

    // ── REVISI CHAPTER YANG SUDAH TERBIT ─────────────────────────────────
    if (action === "approve_revision" || action === "reject_revision") {
      if (!body?.chapter_id || !body?.id) {
        return NextResponse.json({ error: "Chapter tidak valid." }, { status: 400 });
      }
      if (action === "reject_revision" && !note) {
        return NextResponse.json({ error: "Alasan penolakan revisi wajib diisi." }, { status: 400 });
      }

      const manga = await projectApiFetch<{ data?: Record<string, unknown> }>(`/admin/projects/${body.id}`).catch(() => null);
      const slug = String(manga?.data?.slug || "");
      if (!slug) return NextResponse.json({ error: "Project tidak ditemukan." }, { status: 404 });

      const list = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>(
        `/admin/chapters?manga_slug=${encodeURIComponent(slug)}&limit=200&page=1`,
      ).catch(() => ({ data: [] }));
      const chapter = (list.data || []).find((c) => (c as { id?: string }).id === body.chapter_id) as
        | { id?: string; pending_image_urls?: string[] | null; image_urls?: string[] | null }
        | undefined;
      if (!chapter) return NextResponse.json({ error: "Chapter tidak ditemukan." }, { status: 404 });

      if (action === "approve_revision") {
        const pending = Array.isArray(chapter.pending_image_urls) ? chapter.pending_image_urls : [];
        if (!pending.length) return NextResponse.json({ error: "Tidak ada gambar revisi untuk disetujui." }, { status: 400 });
        await projectApiFetch(`/admin/chapters/${body.chapter_id}`, {
          method: "PATCH",
          body: JSON.stringify({
            image_urls: await withChapterBannerMerged(pending),
            pending_image_urls: null,
            review_status: "approved",
            review_note: null,
          }),
        });
      } else {
        await projectApiFetch(`/admin/chapters/${body.chapter_id}`, {
          method: "PATCH",
          body: JSON.stringify({ pending_image_urls: null, review_status: "approved", review_note: note }),
        });
      }

      await logChapterRevision({
        chapterId: body.chapter_id,
        mangaSlug: slug,
        actorId: admin.userId,
        action: action === "approve_revision" ? "approve" : "reject",
        before: { pages: (chapter.image_urls || []).length, pending: (chapter.pending_image_urls || []).length },
        after: action === "approve_revision" ? { pages: (chapter.pending_image_urls || []).length } : { note },
      });

      const owner = manga?.data?.owner_user_id as string | undefined;
      if (owner) {
        await notifyScanlator(owner, {
          type: action === "approve_revision" ? "project_approved" : "project_rejected",
          title:
            action === "approve_revision"
              ? `Revisi chapter disetujui — ${String(manga?.data?.title || "")}`
              : `Revisi chapter ditolak — ${String(manga?.data?.title || "")}`,
          body: action === "approve_revision" ? "Versi baru sudah tayang menggantikan versi lama." : note,
          link: "/scanlator",
        });
      }

      return NextResponse.json({ success: true, status: action });
    }

    // ── SERI ─────────────────────────────────────────────────────────────
    if (!body?.id) return NextResponse.json({ error: "ID project wajib diisi." }, { status: 400 });

    const manga = await projectApiFetch<{ data?: Record<string, unknown> }>(`/admin/projects/${body.id}`).catch(() => null);
    if (!manga?.data) return NextResponse.json({ error: "Project tidak ditemukan." }, { status: 404 });
    if ((manga.data as { review_status?: string }).review_status !== "pending") {
      return NextResponse.json({ error: "Project ini sudah diproses." }, { status: 409 });
    }

    const owner = manga.data.owner_user_id as string | undefined;

    if (action === "reject" || action === "reject_series") {
      if (!note) return NextResponse.json({ error: "Alasan penolakan wajib diisi." }, { status: 400 });
      await projectApiFetch(`/admin/projects/${body.id}`, {
        method: "PATCH",
        body: JSON.stringify({ review_status: "rejected", is_published: false, review_note: note }),
      });
      if (owner) {
        await notifyScanlator(owner, {
          type: "project_rejected",
          title: `Project “${String(manga.data.title || "")}” ditolak`,
          body: note,
          link: "/scanlator",
        });
      }
      return NextResponse.json({ success: true, status: "rejected" });
    }

    if (action === "approve" || action === "approve_series") {
      // ACC seri hanya menyetujui identitas/project. Seri tetap tersembunyi sampai
      // chapter pertamanya disetujui, agar pembaca tidak melihat seri kosong.
      // TAPI seri yang sudah punya chapter terbit tidak boleh diturunkan ke draft:
      // itu membuat semua chapter hilang dari pembaca.
      const seriesChapters = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>(
        `/admin/chapters?manga_slug=${encodeURIComponent(String(manga.data.slug || ""))}&limit=200&page=1`,
      ).catch(() => ({ data: [] }));
      const hasPublishedChapter = (seriesChapters.data || []).some((c) =>
        Boolean((c as { is_published?: boolean }).is_published),
      );
      await projectApiFetch(`/admin/projects/${body.id}`, {
        method: "PATCH",
        body: JSON.stringify({ review_status: "approved", is_published: hasPublishedChapter, review_note: null }),
      });
      if (owner) {
        await notifyScanlator(owner, {
          type: "project_approved",
          title: `Project “${String(manga.data.title || "")}” disetujui`,
          body: "Seri sudah di-ACC dan menunggu chapter pertama. Seri akan otomatis terbit saat chapter pertama di-ACC admin.",
          link: "/scanlator",
        });
      }
      return NextResponse.json({ success: true, status: "approved_waiting_chapter" });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memproses review.");
  }
}
