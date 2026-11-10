import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { projectApiFetch } from "@/lib/projectApiServer";
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

  const chapters = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>(
    `/admin/chapters?manga_slug=${encodeURIComponent(slug)}&limit=200&page=1`,
  ).catch(() => ({ data: [] }));
  const chapter = (chapters.data || []).find((c) => (c as { id?: string }).id === chapterId);
  if (!chapter) return { error: "Chapter tidak ditemukan.", status: 404 as const };
  return { chapter };
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

    await projectApiFetch(`/admin/chapters/${chapterId}`, { method: "DELETE" });

    await logChapterRevision({
      chapterId,
      mangaSlug: slug,
      actorId: userId,
      action: "delete",
      before: revisionSnapshot(owned.chapter as Record<string, unknown>),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return NextResponse.json({ error: "Gagal menghapus chapter." }, { status: 500 });
    return NextResponse.json({ error: "Gagal menghapus chapter." }, { status: 500 });
  }
}
