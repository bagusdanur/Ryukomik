import { NextResponse } from "next/server";
import { projectApiUrl } from "@/lib/projectApiServer";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!SLUG_PATTERN.test(slug)) return NextResponse.json({ error: "Slug tidak valid" }, { status: 400 });
  const url = projectApiUrl(`/projects/${encodeURIComponent(slug)}/chapter-views`);
  if (!url) return NextResponse.json({ data: [] });
  try {
    const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) return NextResponse.json({ data: [] }, { status: response.status });
    return NextResponse.json(await response.json(), {
      headers: { "Cache-Control": "public, max-age=5, s-maxage=5, stale-while-revalidate=10" },
    });
  } catch {
    return NextResponse.json({ data: [] }, { status: 503 });
  }
}
