import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { projectApiFetch } from "@/lib/projectApiServer";

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

/** Edit judul chapter milik sendiri. */
export async function PATCH(request: Request, context: { params: Promise<{ slug: string; chapterId: string }> }) {
  try {
    const userId = await requireUserId(request);
    const { slug, chapterId } = await context.params;
    const owned = await ownChapter(userId, slug, chapterId);
    if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

    const body = (await request.json().catch(() => null)) as { title?: string } | null;
    const title = typeof body?.title === "string" ? body.title.trim().slice(0, 200) : "";
    if (!title) return NextResponse.json({ error: "Judul chapter wajib diisi." }, { status: 400 });

    await projectApiFetch(`/admin/chapters/${chapterId}`, { method: "PATCH", body: JSON.stringify({ title }) });
    return NextResponse.json({ success: true });
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
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return NextResponse.json({ error: "Gagal menghapus chapter." }, { status: 500 });
    return NextResponse.json({ error: "Gagal menghapus chapter." }, { status: 500 });
  }
}
