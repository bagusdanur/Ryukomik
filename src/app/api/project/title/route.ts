import { NextResponse } from "next/server";

import { projectApiFetch } from "@/lib/projectApiServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Judul seri untuk slug project — dipakai riwayat/"Lanjut Baca" agar tidak
 * menampilkan tebakan dari slug (mis. "Ryuscanlation Inma ...").
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("slugs") || "";
  const slugs = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]{3,200}$/i.test(s))
    .slice(0, 20);

  if (!slugs.length) return NextResponse.json({ success: true, titles: {} });

  const entries = await Promise.all(
    slugs.map(async (slug) => {
      try {
        const json = await projectApiFetch<{ data?: { title?: string } }>(
          `/projects/${encodeURIComponent(slug)}`,
          { next: { revalidate: 3600 } } as RequestInit,
        );
        const title = json.data?.title?.trim();
        return [slug, title || null] as const;
      } catch {
        return [slug, null] as const;
      }
    }),
  );

  const titles: Record<string, string> = {};
  for (const [slug, title] of entries) if (title) titles[slug] = title;

  return NextResponse.json({ success: true, titles }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
