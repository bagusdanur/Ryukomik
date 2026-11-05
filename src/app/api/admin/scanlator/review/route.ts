import { NextResponse } from "next/server";

import { adminErrorResponse, verifyAdminRequest } from "@/lib/adminApi";
import { projectApiFetch } from "@/lib/projectApiServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Review karya Scanlator (Fase B): daftar seri pending + ACC/Tolak.
 * ACC = review_status approved + is_published true + chapter-chapter ikut terbit.
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const data = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>("/admin/projects?limit=100&page=1");
    const works = (data.data || [])
      .filter((m) => (m as { review_status?: string }).review_status === "pending")
      .map((m) => ({
        id: (m as { id?: string }).id,
        slug: (m as { slug?: string }).slug,
        title: (m as { title?: string }).title,
        cover_url: (m as { cover_url?: string }).cover_url,
        type: (m as { type?: string }).type,
        is_adult: (m as { is_adult?: boolean }).is_adult,
        scanlator_handle: (m as { scanlator_handle?: string }).scanlator_handle,
        scanlator_team: (m as { scanlator_team?: string }).scanlator_team,
        created_at: (m as { created_at?: string }).created_at,
      }));
    return NextResponse.json({ success: true, works }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memuat antrean review.");
  }
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const body = (await request.json().catch(() => null)) as { id?: string; slug?: string; action?: "approve" | "reject" } | null;
    if (!body?.id || !["approve", "reject"].includes(body.action || "")) {
      return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
    }

    const manga = await projectApiFetch<{ data?: Record<string, unknown> }>(`/admin/projects/${body.id}`).catch(() => null);
    if (!manga?.data) return NextResponse.json({ error: "Seri tidak ditemukan." }, { status: 404 });
    if ((manga.data as { review_status?: string }).review_status !== "pending") {
      return NextResponse.json({ error: "Seri ini sudah diproses." }, { status: 409 });
    }

    if (body.action === "reject") {
      await projectApiFetch(`/admin/projects/${body.id}`, {
        method: "PATCH",
        body: JSON.stringify({ review_status: "rejected", is_published: false }),
      });
      return NextResponse.json({ success: true, status: "rejected" });
    }

    // Approve: seri terbit + chapter-chapter pending ikut terbit.
    await projectApiFetch(`/admin/projects/${body.id}`, {
      method: "PATCH",
      body: JSON.stringify({ review_status: "approved", is_published: true }),
    });
    const slug = (manga.data as { slug?: string }).slug;
    if (slug) {
      const chapters = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>(
        `/admin/chapters?manga_slug=${encodeURIComponent(slug)}&limit=100&page=1`,
      ).catch(() => ({ data: [] }));
      for (const ch of chapters.data || []) {
        const published = (ch as { is_published?: boolean }).is_published;
        const images = (ch as { image_urls?: unknown[] }).image_urls;
        if (!published && Array.isArray(images) && images.length > 0) {
          await projectApiFetch(`/admin/chapters/${(ch as { id?: string }).id}`, {
            method: "PATCH",
            body: JSON.stringify({ is_published: true }),
          }).catch(() => undefined);
        }
      }
    }
    return NextResponse.json({ success: true, status: "approved" });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memproses review.");
  }
}
