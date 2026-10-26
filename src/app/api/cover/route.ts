import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const runtime = "nodejs";

/**
 * Cover project di storage sendiri sering berukuran 1,6–2,6 MB (PNG).
 * Route ini menyajikan versi WebP yang sudah diperkecil lalu menyimpannya di
 * disk, jadi resize hanya sekali per ukuran. Hanya path /covers/ yang boleh.
 */
import { isStorageHost } from "@/lib/storageHosts";
const MIN_WIDTH = 80;
const MAX_WIDTH = 1400;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const CACHE_DIR = path.join(process.cwd(), "data", "cover-cache");

const CACHE_HEADERS = {
  "Content-Type": "image/webp",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "public, max-age=31536000, immutable",
} as const;

function clampWidth(raw: string | null): number {
  const value = Math.floor(Number(raw) || 400);
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const raw = params.get("u") || "";

  let source: URL;
  try {
    source = new URL(raw);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (source.protocol !== "https:" || !isStorageHost(source.hostname)) {
    return new NextResponse("Host is not allowed", { status: 403 });
  }
  if (!source.pathname.startsWith("/covers/")) {
    return new NextResponse("Path is not allowed", { status: 403 });
  }

  const width = clampWidth(params.get("w"));
  const key = createHash("sha1").update(`${source.href}|${width}`).digest("hex");
  const file = path.join(CACHE_DIR, `${key}.webp`);

  try {
    const cached = await readFile(file);
    return new NextResponse(new Uint8Array(cached), { headers: CACHE_HEADERS });
  } catch {
    // belum ada di cache — lanjut ambil dari storage
  }

  try {
    const upstream = await fetch(source.href, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!upstream.ok) {
      return new NextResponse(`Upstream HTTP ${upstream.status}`, { status: 502 });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (!buffer.byteLength) return new NextResponse("Empty image", { status: 502 });
    if (buffer.byteLength > MAX_SOURCE_BYTES) {
      return new NextResponse("Image too large", { status: 413 });
    }

    const resized = await sharp(buffer)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 72, effort: 4 })
      .toBuffer();

    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(file, resized);

    return new NextResponse(new Uint8Array(resized), { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[cover] resize failed:", error instanceof Error ? error.message : error);
    return new NextResponse("Error processing image", { status: 502 });
  }
}
