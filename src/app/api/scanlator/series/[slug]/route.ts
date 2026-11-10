import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { projectApiFetch } from "@/lib/projectApiServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ownedBy(userId: string, slug: string) {
  const profile = await socialQuery<{ handle: string; status: string }>(
    "select handle, status from scanlator_profiles where user_id = $1 limit 1",
    [userId],
  );
  const me = profile.rows[0];
  if (!me || me.status === "revoked") return { error: "Kamu belum Scanlator aktif.", status: 403 as const };
  const manga = await projectApiFetch<{ data?: Record<string, unknown> }>(
    `/admin/projects/by-slug/${encodeURIComponent(slug)}`,
  ).catch(() => null);
  const owner = manga?.data?.owner_user_id as string | undefined;
  if (!manga?.data || owner !== userId) return { error: "Project tidak ditemukan atau bukan milikmu.", status: 404 as const };
  return { manga: manga.data, me };
}

/** Detail project milik sendiri + daftar chapter (termasuk yang belum terbit). */
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const userId = await requireUserId(_request);
    const { slug } = await context.params;
    const owned = await ownedBy(userId, slug);
    if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

    const chapters = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>(
      `/admin/chapters?manga_slug=${encodeURIComponent(slug)}&limit=200&page=1`,
    ).catch(() => ({ data: [] }));

    return NextResponse.json(
      {
        success: true,
        project: {
          slug,
          title: owned.manga.title,
          author: owned.manga.author,
          description: owned.manga.description,
          type: owned.manga.type,
          genres: owned.manga.genres,
          is_adult: owned.manga.is_adult,
          review_status: owned.manga.review_status,
          cover_url: owned.manga.cover_url,
        },
        chapters: (chapters.data || []).map((c) => ({
          id: (c as { id?: string }).id,
          chapter_number: (c as { chapter_number?: number }).chapter_number,
          title: (c as { title?: string | null }).title,
          is_published: (c as { is_published?: boolean }).is_published,
          pages: Array.isArray((c as { image_urls?: unknown[] }).image_urls) ? ((c as { image_urls: unknown[] }).image_urls.length) : 0,
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal memuat project." }, { status: 500 });
  }
}

/** Edit project milik sendiri. Metadata (cover/judul/author) TIDAK memicu review ulang. */
export async function PATCH(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const userId = await requireUserId(request);
    const { slug } = await context.params;
    const owned = await ownedBy(userId, slug);
    if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });
    if (owned.me.status === "suspended") {
      return NextResponse.json({ error: "Akun Scanlator kamu sedang disuspend." }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const patch: Record<string, unknown> = {};
    if (typeof body?.title === "string" && body.title.trim().length >= 2) patch.title = body.title.trim().slice(0, 200);
    if (typeof body?.author === "string") {
      const author = body.author.trim();
      if (author.length >= 2) patch.author = author.slice(0, 100);
      else if (author.length === 0) patch.author = null;
    }
    if (typeof body?.description === "string") patch.description = body.description.trim().slice(0, 3000);
    if (typeof body?.type === "string" && body.type.trim()) patch.type = body.type.trim().slice(0, 30);
    if (Array.isArray(body?.genres)) patch.genres = body.genres.filter((g): g is string => typeof g === "string").slice(0, 10);
    if (typeof body?.is_adult === "boolean") patch.is_adult = body.is_adult;
    if (typeof body?.cover_url === "string" && body.cover_url.startsWith("https://")) {
      patch.cover_url = body.cover_url.trim().slice(0, 500);
    }

    if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });

    // Edit metadata project (cover, judul, author, dll.) TIDAK masuk antrean
    // review lagi — review hanya untuk perubahan chapter. Memaksa pending di
    // sini membuat project hilang dari antrean/beranda dan bikin bug.
    const id = owned.manga.id as string;
    await projectApiFetch(`/admin/projects/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    return NextResponse.json({ success: true, status: "saved" });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[scanlator/series PATCH] gagal:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Gagal menyimpan perubahan." }, { status: 500 });
  }
}

/** Hapus project milik sendiri (soft delete, bisa dipulihkan admin). */
export async function DELETE(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const userId = await requireUserId(request);
    const { slug } = await context.params;
    const owned = await ownedBy(userId, slug);
    if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

    await projectApiFetch(`/admin/projects/${owned.manga.id as string}`, { method: "DELETE" });
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return NextResponse.json({ error: "Gagal menghapus project." }, { status: 500 });
    return NextResponse.json({ error: "Gagal menghapus project." }, { status: 500 });
  }
}
