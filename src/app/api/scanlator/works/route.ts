import { NextResponse } from "next/server";

import { projectApiFetch } from "@/lib/projectApiServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Karya terbit milik satu tim Scanlator (untuk halaman publik /scanlator/[handle]). */
export async function GET(request: Request) {
  const handle = (new URL(request.url).searchParams.get("handle") || "").toLowerCase();
  if (!handle) return NextResponse.json({ error: "Handle wajib diisi." }, { status: 400 });

  const data = await projectApiFetch<{ data?: Array<Record<string, unknown>> }>("/projects?limit=100&page=1").catch(() => ({ data: [] }));
  const works = (data.data || [])
    .filter((m) => ((m as { scanlator_handle?: string }).scanlator_handle || "").toLowerCase() === handle)
    .map((m) => ({
      slug: (m as { slug?: string }).slug,
      title: (m as { title?: string }).title,
      cover_url: (m as { cover_url?: string }).cover_url,
      type: (m as { type?: string }).type,
      latest_chapter: (m as { latest_chapter?: number | null }).latest_chapter ?? null,
      updated_at: (m as { updated_at?: string }).updated_at ?? null,
      latest_chapter_at: (m as { latest_chapter_uploaded_at?: string }).latest_chapter_uploaded_at ?? null,
    }));
  return NextResponse.json({ success: true, works }, { headers: { "Cache-Control": "public, max-age=60" } });
}
