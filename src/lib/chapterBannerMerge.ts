import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

import { CHAPTER_BANNER_URL } from "./chapterBanner";
import { targetById } from "./r2Targets";

/**
 * Tempel banner Scanlator ke BAWAH halaman terakhir (bukan gambar tambahan).
 *
 * Alasan: mirror luar membuang gambar terakhir (dianggap iklan) dan/atau hanya
 * mengambil gambar dari host yang sama dengan halaman chapter. Dengan menyatukan
 * banner ke halaman terakhir, tidak ada URL tambahan yang bisa dibuang.
 *
 * Kalau pemrosesan gagal (host gambar tidak dikenal, download gagal, sharp
 * error), fungsi ini fallback ke perilaku lama: banner jadi gambar terpisah.
 */
let bannerBufferPromise: Promise<Buffer> | null = null;

function bannerBuffer() {
  if (!bannerBufferPromise) {
    bannerBufferPromise = readFile(path.join(process.cwd(), "public", "banner-scanlator.webp"));
  }
  return bannerBufferPromise;
}

const FETCH_UA = "Mozilla/5.0 (compatible; RyukomikBanner/1.0)";

function isHttp(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

export async function withChapterBannerMerged(imageUrls: unknown): Promise<string[]> {
  const urls = Array.isArray(imageUrls) ? imageUrls.filter(isHttp) : [];
  if (urls.length === 0) return urls;

  // Buang banner lama di posisi terakhir supaya tidak menumpuk.
  while (urls.length > 0 && urls[urls.length - 1] === CHAPTER_BANNER_URL) urls.pop();
  if (urls.length === 0) return urls;

  const target = targetById(undefined);
  const last = urls[urls.length - 1];

  try {
    const src = new URL(last);
    if (!src.toString().startsWith(target.publicBase)) throw new Error("host gambar bukan storage alt");
    const key = decodeURIComponent(src.pathname.replace(/^\//, ""));
    if (!key) throw new Error("key kosong");

    const res = await fetch(last, { headers: { "User-Agent": FETCH_UA } });
    if (!res.ok) throw new Error(`GET halaman ${res.status}`);
    const pageBuf = Buffer.from(await res.arrayBuffer());

    const meta = await sharp(pageBuf).metadata();
    const width = meta.width || 0;
    const pageHeight = meta.height || 0;
    if (!width || !pageHeight) throw new Error("dimensi halaman tidak terbaca");

    const banner = await sharp(await bannerBuffer()).resize({ width }).toBuffer();
    const bannerMeta = await sharp(banner).metadata();
    const bannerHeight = bannerMeta.height || 0;
    if (!bannerHeight) throw new Error("dimensi banner tidak terbaca");

    const merged = await sharp(pageBuf)
      .extend({ bottom: bannerHeight, background: "#ffffff" })
      .composite([{ input: banner, top: pageHeight, left: 0 }])
      .webp({ quality: 95, effort: 6 })
      .toBuffer();

    const outKey = `${key.replace(/\.[a-z0-9]+$/i, "")}-banner.webp`;
    await target.client.send(
      new PutObjectCommand({
        Bucket: target.bucket,
        Key: outKey,
        Body: merged,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    return [...urls.slice(0, -1), `${target.publicBase}/${outKey}`];
  } catch (error) {
    console.error(
      "[chapterBanner] gabung banner gagal, fallback gambar terpisah:",
      error instanceof Error ? error.message : error,
    );
    return [...urls, CHAPTER_BANNER_URL];
  }
}
