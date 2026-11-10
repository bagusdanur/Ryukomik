import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { projectApiFetch } from "@/lib/projectApiServer";
import { deleteR2File } from "@/lib/r2Storage";
import { logChapterRevision, revisionSnapshot } from "@/lib/scanlatorAudit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ownChapter(userId: string, slug: string, chapterId: string) {
  const profile = await socialQuery<{ status: string }>(
    "select status from scanlator_profiles where user_id = $1 limit 1",
    [userId],
  );
  const me = profile.rows[0];
  if (!me || me.status === "revoked") return { error: "Kamu belum Scanlator aktif.", status: 403 as const };
  if (me.status === "suspended") return { error: "Akun Scanlator kamu sedang disuspend.", status: 403 as const };

  const manga = await projectApiFetch<{ data?: Record<string, unknown> }>(
    `/admin/projects/by-slug/${encodeURIComponent(slug)}`,
  ).catch(() => null);
  if (!manga?.data || (manga.data.owner_user_id as string | undefined) !== userId) {
    return { error: "Project tidak ditemukan atau bukan milikmu.", status: 404 as const };
  }

  // Ambil chapter langsung by id (bukan daftar 100 pertama) supaya chapter lama
  // pada seri panjang tetap bisa dibuka/diedit/dihapus.
  const chapterRow = await projectApiFetch<{ data?: Record<string, unknown> }>(
    `/admin/chapters/${encodeURIComponent(chapterId)}`,
  ).catch(() => null);
  const chapter = chapterRow?.data;
  if (!chapter || String(chapter.manga_slug || "") !== slug) {
    return { error: "Chapter tidak ditemukan.", status: 404 as const };
  }
  return { chapter, manga: manga.data };
}

/** Semua chapter satu seri (dipakai cek hapus: file bersama & chapter terbit lain). */
async function allChapters(slug: string) {
  const rows: Array<Record<string, unknown>> = [];
  for (let page = 1; page <= 20; page += 1) {
    const res = await projectApiFetch<{ data?: Array<Record<string, unknown>>; total?: number }>(
      `/admin/chapters?manga_slug=${encodeURIComponent(slug)}&limit=100&page=${page}`,
    ).catch(() => null);
    const batch = res?.data || [];
    rows.push(...batch);
    if (batch.length < 100 || rows.length >= Number(res?.total || 0)) break;
  }
  return rows;
}

/** Detail satu chapter (dipakai editor & pratinjau studio). */
export async function GET(request: Request, context: { params: Promise<{ slug: string; chapterId: string }> }) {
  try {
    const userId = await requireUserId(request);
    const { slug, chapterId } = await context.params;
    const owned = await ownChapter(userId, slug, chapterId);
    if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

    const c = owned.chapter as Record<string, unknown>;
    return NextResponse.json(
      {
        success: true,
        chapter: {
          id: String(c.id || ""),
          chapter_number: Number(c.chapter_number || 0),
          title: (c.title as string | null) || null,
          is_published: Boolean(c.is_published),
          image_urls: Array.isArray(c.image_urls) ? (c.image_urls as string[]) : [],
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal memuat chapter." }, { status: 500 });
  }
}

/** Edit judul chapter milik sendiri. */
export async function PATCH(request: Request, context: { params: Promise<{ slug: string; chapterId: string }> }) {
  try {
    const userId = await requireUserId(request);
    const { slug, chapterId } = await context.params;
    const owned = await ownChapter(userId, slug, chapterId);
    if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

    const body = (await request.json().catch(() => null)) as { title?: string; image_urls?: unknown } | null;

    const patch: Record<string, unknown> = {};

    if (typeof body?.title === "string") {
      const title = body.title.trim().slice(0, 200);
      if (!title) return NextResponse.json({ error: "Judul chapter wajib diisi." }, { status: 400 });
      patch.title = title;
    }

    const before = owned.chapter as Record<string, unknown>;
    const published = Boolean(before.is_published);
    let reviewRequired = false;

    if (Array.isArray(body?.image_urls)) {
      const urls = body.image_urls.filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u));
      if (urls.length === 0) return NextResponse.json({ error: "Chapter minimal punya 1 gambar." }, { status: 400 });
      if (urls.length > 100) return NextResponse.json({ error: "Maksimal 100 gambar per chapter." }, { status: 400 });

      if (published) {
        // Chapter sudah tayang: simpan sebagai revisi, pembaca tetap lihat versi lama.
        patch.pending_image_urls = urls;
        patch.review_status = "pending";
        patch.review_requested_at = new Date().toISOString();
        reviewRequired = true;
      } else {
        patch.image_urls = urls;
        patch.review_status = "approved";
      }
    }

    if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });

    await projectApiFetch(`/admin/chapters/${chapterId}`, { method: "PATCH", body: JSON.stringify(patch) });

    await logChapterRevision({
      chapterId,
      mangaSlug: slug,
      actorId: userId,
      action: patch.pending_image_urls ? "edit_pages" : Array.isArray(patch.image_urls) ? "edit_pages" : "edit_title",
      before: revisionSnapshot(before),
      after: {
        ...revisionSnapshot(before),
        ...(Array.isArray(patch.image_urls) ? { pages: (patch.image_urls as string[]).length } : {}),
        ...(Array.isArray(patch.pending_image_urls) ? { pages: (patch.pending_image_urls as string[]).length, pending: true } : {}),
        ...(typeof patch.title === "string" ? { title: patch.title } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      reviewRequired,
      pages: Array.isArray(patch.image_urls) ? (patch.image_urls as string[]).length : undefined,
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal menyimpan chapter." }, { status: 500 });
  }
}

/** Hapus chapter milik sendiri. */
export async function DELETE(request: Request, context: { params: Promise<{ slug: string; chapterId: string }> }) {
  try {
    const userId = await requireUserId(request);
    const { slug, chapterId } = await context.params;
    const owned = await ownChapter(userId, slug, chapterId);
    if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

    const chapter = owned.chapter as Record<string, unknown>;
    const isPublished = Boolean(chapter.is_published);

    // Chapter yang sudah terbit tidak boleh hilang tanpa konfirmasi eksplisit
    // (pembaca kehilangan akses dan gambarnya ikut dibersihkan dari R2).
    if (isPublished && new URL(request.url).searchParams.get("confirm") !== "published") {
      return NextResponse.json(
        {
          error: `Chapter ${Number(chapter.chapter_number || 0)} sudah terbit. Hapus permanen?`,
          requiresConfirm: true,
        },
        { status: 409 },
      );
    }

    const urlsOf = (value: unknown) =>
      Array.isArray(value) ? value.filter((u): u is string => typeof u === "string") : [];
    const ownUrls = [...urlsOf(chapter.image_urls), ...urlsOf(chapter.pending_image_urls)];

    const others = (await allChapters(slug)).filter((c) => c.id !== chapterId);

    await projectApiFetch(`/admin/chapters/${chapterId}`, { method: "DELETE" });

    await logChapterRevision({
      chapterId,
      mangaSlug: slug,
      actorId: userId,
      action: "delete",
      before: revisionSnapshot(chapter),
    });

    // Hapus objek R2 milik chapter ini — hanya yang tidak dipakai chapter lain,
    // dan hanya di prefix scanlator (banner promosi tidak ikut).
    const usedElsewhere = new Set<string>();
    for (const other of others) {
      for (const url of [...urlsOf(other.image_urls), ...urlsOf(other.pending_image_urls)]) {
        usedElsewhere.add(url);
      }
    }
    const keys = [...new Set(ownUrls)]
      .filter((url) => !usedElsewhere.has(url))
      .map((url) => {
        try {
          const key = new URL(url).pathname.replace(/^\//, "");
          return key.startsWith("scanlator/") ? key : null;
        } catch {
          return null;
        }
      })
      .filter((key): key is string => Boolean(key));
    await Promise.all(keys.map((key) => deleteR2File(key).catch(() => undefined)));

    // Seri tidak boleh tetap terbit tanpa satu pun chapter terbit.
    const stillPublished = others.some((c) => Boolean(c.is_published));
    let seriesUnpublished = false;
    if (isPublished && !stillPublished) {
      const mangaId = String((owned.manga as Record<string, unknown>).id || "");
      if (mangaId) {
        await projectApiFetch(`/admin/projects/${mangaId}`, {
          method: "PATCH",
          body: JSON.stringify({ is_published: false }),
        }).catch(() => undefined);
        seriesUnpublished = true;
      }
    }

    return NextResponse.json({ success: true, imagesDeleted: keys.length, seriesUnpublished });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal menghapus chapter." }, { status: 500 });
  }
}
