import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { RawError, countTodayDownloads, isRawSource, requireRawAccess, signRawDownload } from "@/lib/scanlatorRaw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Terbitkan URL unduhan bertanda tangan (berlaku 10 menit).
 * Browser memakai URL itu langsung, sehingga file besar mengalir ke disk
 * dan tidak ditahan di memori perangkat.
 */
export async function POST(request: Request) {
  try {
    const access = await requireRawAccess(request);
    const body = (await request.json().catch(() => null)) as
      | { source?: string; slug?: string; chapter?: string }
      | null;

    const source = String(body?.source || "");
    const series = String(body?.slug || "").trim();
    const chapter = String(body?.chapter || "").trim();

    if (!isRawSource(source)) return NextResponse.json({ error: "Sumber tidak dikenal." }, { status: 400 });
    if (!/^[a-z0-9][a-z0-9-]{0,120}$/i.test(series)) {
      return NextResponse.json({ error: "Slug seri tidak valid." }, { status: 400 });
    }
    if (!/^[a-z0-9][a-z0-9-]{0,60}$/i.test(chapter)) {
      return NextResponse.json({ error: "Slug chapter tidak valid." }, { status: 400 });
    }

    const used = await countTodayDownloads(access.userId);
    if (used >= access.dailyLimit) {
      return NextResponse.json(
        { error: `Batas harian tercapai (${access.dailyLimit} chapter/hari). Coba lagi besok.` },
        { status: 429 },
      );
    }

    const token = signRawDownload(access.userId, source, series, chapter);
    return NextResponse.json(
      {
        success: true,
        url: `/api/scanlator/raw/download?t=${encodeURIComponent(token)}`,
        remaining: Math.max(0, access.dailyLimit - used),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof RawError) return NextResponse.json({ error: error.message }, { status: error.status });
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal menyiapkan unduhan." }, { status: 500 });
  }
}
