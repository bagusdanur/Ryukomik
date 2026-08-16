import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { projectApiFetch } from "@/lib/projectApiServer";
import { adminErrorResponse, verifyAdminRequest } from "@/lib/adminApi";

const getProjectViewStats = unstable_cache(
  async () => {
    return projectApiFetch<{ readersToday: number; readers7d: number; bySlug: Record<string, number> }>("/admin/stats");
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
