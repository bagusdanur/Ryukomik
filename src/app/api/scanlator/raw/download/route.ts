import JSZip from "jszip";
import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { mergeToStrips } from "@/lib/rawImageConvert";
import {
  RawError,
  countTodayDownloads,
  isRawSource,
  rawApi,
  rawAccessByUserId,
  recordDownload,
  requireRawAccess,
  verifyRawDownload,
} from "@/lib/scanlatorRaw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_IMAGES = 150;
const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
const MAX_TOTAL_BYTES = 250 * 1024 * 1024;

/** Ambil ekstensi dari URL gambar (bisa berupa proxy ?url=...). */
function extensionOf(rawUrl: string): string {
  let candidate = rawUrl;
  try {
    const parsed = new URL(rawUrl);
    const inner = parsed.searchParams.get("url");
    if (inner) candidate = inner;
  } catch {
    /* biarkan apa adanya */
  }
  const match = candidate.split("?")[0].match(/\.(webp|png|jpe?g|gif|avif)$/i);
  return (match?.[1] || "jpg").toLowerCase().replace("jpeg", "jpg");
}

function safeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\w\-. ]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "raw";
}

async function fetchImage(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8", "User-Agent": "RyukomikScanlatorStudio/1.0" },
      cache: "no-store",
    });
    if (!response.ok) throw new RawError(502, `Gambar menjawab ${response.status}.`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) throw new RawError(413, "Ada gambar yang terlalu besar.");
    return buffer;
  } finally {
    clearTimeout(timer);
  }
}

/** Unduh satu chapter RAW dan kirim sebagai ZIP (tidak disimpan di server). */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const signed = url.searchParams.get("t");
    const fromToken = signed ? verifyRawDownload(signed) : null;

    const access = fromToken ? await rawAccessByUserId(fromToken.userId) : await requireRawAccess(request);
    const source = fromToken ? fromToken.source : url.searchParams.get("source") || "";
    const series = (fromToken ? fromToken.series : url.searchParams.get("slug") || "").trim();
    const chapter = (fromToken ? fromToken.chapter : url.searchParams.get("chapter") || "").trim();

    if (!isRawSource(source)) return NextResponse.json({ error: "Sumber tidak dikenal." }, { status: 400 });
    if (!/^[a-z0-9][a-z0-9-]{0,120}$/i.test(series)) {
      return NextResponse.json({ error: "Slug seri tidak valid." }, { status: 400 });
    }
    if (!/^[a-z0-9][a-z0-9-]{0,60}$/i.test(chapter)) {
      return NextResponse.json({ error: "Slug chapter tidak valid." }, { status: 400 });
    }

    const usedToday = await countTodayDownloads(access.userId);
    if (usedToday >= access.dailyLimit) {
      return NextResponse.json(
        { error: `Batas harian tercapai (${access.dailyLimit} chapter/hari). Coba lagi besok.` },
        { status: 429 },
      );
    }

    const payload = (await rawApi(
      `/${source}/chapter/${encodeURIComponent(series)}/${encodeURIComponent(chapter)}`,
      45_000,
    )) as { images?: string[]; data?: { images?: string[] }; title?: string };

    let images = payload.images || payload.data?.images || [];
    images = images.filter((item) => typeof item === "string" && /^https?:\/\//.test(item));

    if (!images.length) {
      return NextResponse.json(
        { error: "Chapter ini tidak punya gambar — kemungkinan terkunci atau berbayar di sumber." },
        { status: 404 },
      );
    }
    if (images.length > MAX_IMAGES) images = images.slice(0, MAX_IMAGES);

    // 1. Ambil semua gambar lebih dulu (4 paralel), simpan di memori.
    const collected: Buffer[] = [];
    let sourceBytes = 0;

    for (let index = 0; index < images.length; index += 4) {
      const batch = images.slice(index, index + 4);
      const buffers = await Promise.all(
        batch.map(async (imageUrl) => {
          try {
            return await fetchImage(imageUrl);
          } catch {
            return null;
          }
        }),
      );
      for (const buffer of buffers) {
        if (!buffer) continue;
        sourceBytes += buffer.length;
        if (sourceBytes > MAX_TOTAL_BYTES) throw new RawError(413, "Chapter terlalu besar untuk diunduh sekaligus.");
        collected.push(buffer);
      }
    }

    if (!collected.length) return NextResponse.json({ error: "Semua gambar gagal diambil dari sumber." }, { status: 502 });

    // 2. Gabung jadi strip WebP (maks 12.000 px per strip), seperti converter bot.
    const stem = `${safeName(series)}-${safeName(chapter)}`;
    const strips = await mergeToStrips(collected, stem, 95);
    if (!strips.length) return NextResponse.json({ error: "Gagal mengonversi gambar chapter ini." }, { status: 502 });

    // 3. Bungkus ZIP (STORE — isinya sudah terkompresi WebP).
    const zip = new JSZip();
    let total = 0;
    for (const strip of strips) {
      total += strip.data.length;
      if (total > MAX_TOTAL_BYTES) throw new RawError(413, "Hasil konversi terlalu besar untuk diunduh sekaligus.");
      zip.file(strip.name, strip.data);
    }

    const nodeBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "STORE" });
    const filename = `${stem}.zip`;

    await recordDownload({
      userId: access.userId,
      handle: access.handle,
      source,
      seriesSlug: series,
      seriesTitle: payload.title || series,
      chapterSlug: chapter,
      chapterTitle: chapter,
      images: collected.length,
      bytes: nodeBuffer.length,
    }).catch(() => undefined);

    return new NextResponse(new Uint8Array(nodeBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(nodeBuffer.length),
        "Cache-Control": "private, no-store",
        "X-Raw-Images": String(collected.length),
        "X-Raw-Strips": String(strips.length),
        "X-Raw-Bytes": String(nodeBuffer.length),
      },
    });
  } catch (error) {
    if (error instanceof RawError) return NextResponse.json({ error: error.message }, { status: error.status });
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal mengunduh RAW." }, { status: 500 });
  }
}
