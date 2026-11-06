import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { projectApiFetch } from "@/lib/projectApiServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Statistik tayangan per chapter untuk satu seri milik Scanlator. */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const slug = (new URL(request.url).searchParams.get("slug") || "").trim();
    if (!slug) return NextResponse.json({ error: "slug wajib diisi." }, { status: 400 });

    const profile = await socialQuery<{ handle: string }>(
      "select handle from scanlator_profiles where user_id = $1 limit 1",
      [userId],
    );
    if (!profile.rows[0]) return NextResponse.json({ error: "Kamu belum Scanlator aktif." }, { status: 403 });

    const manga = await projectApiFetch<{ data?: Record<string, unknown> }>(
      `/admin/projects/by-slug/${encodeURIComponent(slug)}`,
    ).catch(() => null);
    if (!manga?.data || (manga.data.owner_user_id as string | undefined) !== userId) {
      return NextResponse.json({ error: "Project bukan milikmu." }, { status: 404 });
    }

    const [chaptersRes, viewsRes] = await Promise.all([
      projectApiFetch<{ data?: Array<Record<string, unknown>> }>(
        `/admin/chapters?manga_slug=${encodeURIComponent(slug)}&limit=200&page=1`,
      ).catch(() => ({ data: [] })),
      projectApiFetch<{ data?: Array<{ chapter_number: string; view_count: number }> }>(
        `/projects/${encodeURIComponent(slug)}/chapter-views`,
      ).catch(() => ({ data: [] })),
    ]);

    const views = new Map<string, number>();
    for (const row of viewsRes.data || []) {
      views.set(String(Number(row.chapter_number)), Number(row.view_count || 0));
    }

    const chapters = (chaptersRes.data || []).map((c) => {
      const num = Number((c as { chapter_number?: number }).chapter_number || 0);
      return {
        chapter_number: num,
        title: ((c as { title?: string | null }).title ?? null) as string | null,
        pages: Array.isArray((c as { image_urls?: unknown[] }).image_urls) ? ((c as { image_urls: unknown[] }).image_urls.length) : 0,
        is_published: Boolean((c as { is_published?: boolean }).is_published),
        views: views.get(String(Number(num))) || 0,
      };
    });

    chapters.sort((a, b) => b.chapter_number - a.chapter_number);
    const top = [...chapters].sort((a, b) => b.views - a.views)[0] || null;

    return NextResponse.json(
      { success: true, chapters, top: top && top.views > 0 ? top : null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal memuat statistik chapter." }, { status: 500 });
  }
}
