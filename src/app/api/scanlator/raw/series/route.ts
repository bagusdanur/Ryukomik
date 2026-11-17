import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { RawError, isRawSource, rawApi, requireRawAccess } from "@/lib/scanlatorRaw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChapterItem = {
  title?: string;
  slug?: string;
  date?: string;
  locked?: boolean;
  isLocked?: boolean;
  is_locked?: boolean;
  premium?: boolean;
  is_premium?: boolean;
  coins?: number | string;
};

/**
 * Beberapa sumber (Mist, EvaScan, dan lainnya) menandai chapter berbayar.
 * Chapter seperti itu tidak bisa diunduh, jadi jangan ditampilkan sama sekali
 * supaya scanlator tidak menekan tombol yang pasti gagal.
 */
function isLockedChapter(chapter: ChapterItem): boolean {
  if (chapter.locked === true || chapter.isLocked === true || chapter.is_locked === true) return true;
  if (chapter.premium === true || chapter.is_premium === true) return true;
  const coins = Number(chapter.coins ?? 0);
  return Number.isFinite(coins) && coins > 0 && chapter.locked !== false;
}

/** Daftar chapter sebuah seri di sumber RAW. */
export async function GET(request: Request) {
  try {
    await requireRawAccess(request);
    const url = new URL(request.url);
    const source = url.searchParams.get("source") || "";
    const slug = (url.searchParams.get("slug") || "").trim();

    if (!isRawSource(source)) return NextResponse.json({ error: "Sumber tidak dikenal." }, { status: 400 });
    if (!/^[a-z0-9][a-z0-9-]{0,120}$/i.test(slug)) {
      return NextResponse.json({ error: "Slug seri tidak valid." }, { status: 400 });
    }

    const payload = (await rawApi(`/${source}/detail/${encodeURIComponent(slug)}`)) as {
      data?: { title?: string; thumbnail?: string; chapters?: ChapterItem[] };
    };
    const data = payload.data || {};
    const all = data.chapters || [];
    const open = all.filter((chapter) => !isLockedChapter(chapter));
    const chapters = open
      .map((chapter) => ({
        title: String(chapter.title || "").trim(),
        slug: String(chapter.slug || "").trim(),
        date: chapter.date || null,
      }))
      .filter((chapter) => chapter.slug)
      .reverse(); // sumber mengirim terbaru dulu; dibalik agar urut naik

    return NextResponse.json(
      {
        success: true,
        source,
        slug,
        title: data.title || slug,
        thumbnail: data.thumbnail || null,
        chapters,
        lockedCount: all.length - open.length,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof RawError) return NextResponse.json({ error: error.message }, { status: error.status });
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal mengambil daftar chapter." }, { status: 500 });
  }
}
