import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { projectApiFetch } from "@/lib/projectApiServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Statistik project milik Scanlator: views, chapter, pembaca. */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const profile = await socialQuery<{ handle: string }>(
      "select handle from scanlator_profiles where user_id = $1 limit 1",
      [userId],
    );
    if (!profile.rows[0]) return NextResponse.json({ error: "Kamu belum Scanlator aktif." }, { status: 403 });

    const list = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>(
      "/admin/projects?limit=100&page=1",
    ).catch(() => ({ data: [] }));

    const mine = (list.data || []).filter((m) => (m as { owner_user_id?: string }).owner_user_id === userId);

    let totalViews = 0;
    const projects: Array<{ slug: string; title: string; cover_url: string | null; views: number; chapters: number }> = [];

    for (const raw of mine) {
      const m = raw as Record<string, unknown>;
      const slug = String(m.slug || "");
      const views = Number(m.view_count || 0);
      totalViews += views;
      // jumlah chapter dari endpoint detail (sudah tersedia, tanpa query tambahan berat)
      const detail = await projectApiFetch<{ data?: { chapters?: unknown[] } }>(
        `/projects/${encodeURIComponent(slug)}`,
      ).catch(() => null);
      projects.push({
        slug,
        title: String(m.title || ""),
        cover_url: (m.cover_url as string | null) || null,
        views,
        chapters: Array.isArray(detail?.data?.chapters) ? (detail!.data!.chapters as unknown[]).length : 0,
      });
    }

    projects.sort((a, b) => b.views - a.views);
    const totalChapters = projects.reduce((sum, p) => sum + p.chapters, 0);

    return NextResponse.json(
      { success: true, totalViews, totalChapters, projectCount: projects.length, projects: projects.slice(0, 10) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal memuat statistik." }, { status: 500 });
  }
}
