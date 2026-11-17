import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { RawError, isRawSource, rawApi, requireRawAccess } from "@/lib/scanlatorRaw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchItem = {
  title?: string;
  slug?: string;
  image?: string;
  update?: string;
  type_genre?: string;
  rating?: string;
};

/** Pencarian seri di sumber RAW. */
export async function GET(request: Request) {
  try {
    await requireRawAccess(request);
    const url = new URL(request.url);
    const source = url.searchParams.get("source") || "";
    const query = (url.searchParams.get("q") || "").trim();

    if (!isRawSource(source)) return NextResponse.json({ error: "Sumber tidak dikenal." }, { status: 400 });
    if (query.length < 2) return NextResponse.json({ error: "Kata kunci minimal 2 huruf." }, { status: 400 });

    const payload = (await rawApi(`/${source}/search?q=${encodeURIComponent(query)}`)) as {
      data?: SearchItem[];
      results?: SearchItem[];
    };
    const items = payload.data || payload.results || [];

    const results = items
      .map((item) => ({
        title: String(item.title || "").trim(),
        slug: String(item.slug || "").trim(),
        image: item.image || null,
        update: item.update || null,
        type: item.type_genre || null,
        rating: item.rating || null,
      }))
      .filter((item) => item.slug && item.title)
      .slice(0, 24);

    return NextResponse.json(
      { success: true, source, results },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof RawError) return NextResponse.json({ error: error.message }, { status: error.status });
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal mencari di sumber RAW." }, { status: 500 });
  }
}
