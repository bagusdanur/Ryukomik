import { NextResponse } from "next/server";

import { adminErrorResponse, verifyAdminRequest } from "@/lib/adminApi";
import { projectApiFetch } from "@/lib/projectApiServer";
import { notifyScanlator } from "@/lib/scanlatorNotify";
import { logChapterRevision } from "@/lib/scanlatorAudit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PendingChapter = {
  id: string;
  chapter_number: number;
  title: string | null;
  pages: number;
  is_published: boolean;
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

    const data = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>("/admin/projects?limit=100&page=1");
    // Sertakan seri yang masih pending ATAU punya chapter yang belum terbit —
    // supaya chapter baru pada seri yang sudah di-ACC tetap masuk antrean.
    const candidates = (data.data || []).filter((m) => Boolean((m as { owner_user_id?: string }).owner_user_id));

    const works = await Promise.all(
      candidates.map(async (raw) => {
        const m = raw as Record<string, unknown>;
        const slug = String(m.slug || "");
        const chapterRes = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>(
          `/admin/chapters?manga_slug=${encodeURIComponent(slug)}&limit=200&page=1`,
        ).catch(() => ({ data: [] }));

        const chapters: PendingChapter[] = (chapterRes.data || [])
          .map((c) => ({
            id: String((c as { id?: string }).id || ""),
            chapter_number: Number((c as { chapter_number?: number }).chapter_number || 0),
            title: ((c as { title?: string | null }).title ?? null) as string | null,
            pages: Array.isArray((c as { image_urls?: unknown[] }).image_urls) ? ((c as { image_urls: unknown[] }).image_urls.length) : 0,
            is_published: Boolean((c as { is_published?: boolean }).is_published),
          }))
          .sort((a, b) => a.chapter_number - b.chapter_number);

        const pendingChapters = chapters.filter((c) => !c.is_published);

        return {
          id: String(m.id || ""),
          slug,
          title: String(m.title || ""),
          cover_url: (m.cover_url as string | null) || null,
          type: (m.type as string | null) || null,
          is_adult: Boolean(m.is_adult),
          scanlator_handle: (m.scanlator_handle as string | null) || null,
          scanlator_team: (m.scanlator_team as string | null) || null,
          chapters,
          pendingChapters,
          review_status: (m.review_status as string | null) || null,
        };
      }),
    );

    const filtered = works.filter((w) => w.review_status === "pending" || (w.pendingChapters?.length ?? 0) > 0);

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
      if (!body?.chapter_id) return NextResponse.json({ error: "Chapter tidak valid." }, { status: 400 });
      if (action === "reject_chapter" && !note) {
        return NextResponse.json({ error: "Alasan penolakan chapter wajib diisi." }, { status: 400 });
      }

      await projectApiFetch(`/admin/chapters/${body.chapter_id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_published: action === "approve_chapter" }),
      });

      if (body.id) {
        const manga = await projectApiFetch<{ data?: Record<string, unknown> }>(`/admin/projects/${body.id}`).catch(() => null);
        await logChapterRevision({
          chapterId: body.chapter_id,
          mangaSlug: String(manga?.data?.slug || ""),
          actorId: admin.userId,
          action: action === "approve_chapter" ? "approve" : "reject",
          after: { is_published: action === "approve_chapter", note },
        });
        const owner = manga?.data?.owner_user_id as string | undefined;
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
      // Seri disetujui TANPA menerbitkan chapter — chapter di-ACC satu per satu.
      await projectApiFetch(`/admin/projects/${body.id}`, {
        method: "PATCH",
        body: JSON.stringify({ review_status: "approved", is_published: true, review_note: null }),
      });
      if (owner) {
        await notifyScanlator(owner, {
          type: "project_approved",
          title: `Project “${String(manga.data.title || "")}” disetujui`,
          body: "Seri sudah tampil. Chapter perlu disetujui satu per satu oleh admin.",
          link: `/komik/project/${String(manga.data.slug || "")}`,
        });
      }
      return NextResponse.json({ success: true, status: "approved" });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memproses review.");
  }
}
