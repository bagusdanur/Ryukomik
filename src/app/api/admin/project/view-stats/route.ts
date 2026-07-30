import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { adminErrorResponse, verifyAdminRequest } from "@/lib/adminApi";

const getProjectViewStats = unstable_cache(
  async () => {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 6);
    const { data, error } = await supabaseAdmin
      .from("project_manga_view_daily")
      .select("manga_slug, viewed_on, unique_views")
      .gte("viewed_on", since.toISOString().slice(0, 10));
    if (error) throw error;

    const bySlug: Record<string, number> = {};
    let readers7d = 0;
    let readersToday = 0;
    const today = new Date().toISOString().slice(0, 10);
    for (const row of data || []) {
      const views = Number(row.unique_views) || 0;
      bySlug[row.manga_slug] = (bySlug[row.manga_slug] || 0) + views;
      readers7d += views;
      if (row.viewed_on === today) readersToday += views;
    }
    return { readersToday, readers7d, bySlug };
  },
  ["project-view-stats"],
  { revalidate: 600, tags: ["project-view-stats"] },
);

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });
    return NextResponse.json(await getProjectViewStats(), {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memuat statistik Project.");
  }
}
