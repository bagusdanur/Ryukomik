import { NextResponse } from "next/server";

import { adminErrorResponse, verifyAdminRequest } from "@/lib/adminApi";
import { projectApiFetch } from "@/lib/projectApiServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Daftar project milik satu Scanlator (untuk panel admin). */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const userId = new URL(request.url).searchParams.get("user_id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return NextResponse.json({ error: "user_id tidak valid." }, { status: 400 });

    const list = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>("/admin/projects?limit=100&page=1")
      .catch(() => ({ data: [] }));

    const works = await Promise.all(
      (list.data || [])
        .filter((m) => (m as { owner_user_id?: string }).owner_user_id === userId)
        .map(async (m) => {
          const r = m as Record<string, unknown>;
          const slug = String(r.slug || "");
          const chapters = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>(
            `/admin/chapters?manga_slug=${encodeURIComponent(slug)}&limit=200&page=1`,
          ).catch(() => ({ data: [] }));
          const rows = chapters.data || [];
          return {
            slug,
            title: r.title,
            cover_url: (r.cover_url as string | null) || null,
            type: (r.type as string | null) || null,
            review_status: r.review_status,
            review_note: (r.review_note as string | null) || null,
            is_published: r.is_published,
            view_count: Number(r.view_count || 0),
            updated_at: r.updated_at,
            chapters_total: rows.length,
            chapters_published: rows.filter((c) => Boolean((c as { is_published?: boolean }).is_published)).length,
          };
        }),
    );

    return NextResponse.json({ success: true, works }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memuat project Scanlator.");
  }
}
