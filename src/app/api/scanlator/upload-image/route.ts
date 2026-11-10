import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

import { targetById } from "@/lib/r2Targets";
import { getScanlatorUsage, SCANLATOR_QUOTA_BYTES, formatBytes } from "@/lib/scanlatorQuota";
import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { rateLimitResponse } from "@/lib/rateLimit";
import { socialQuery } from "@/lib/social/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 30 * 1024 * 1024; // 30 MB per file (aturan S&K)

/**
 * Upload gambar Scanlator (cover/chapter) ke R2 bucket project.
 * Kompresi otomatis via sharp; halaman terakhir chapter diberi watermark
 * nama tim bila `watermark=true` (aturan S&K 8.3).
 */
export async function POST(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId(request);
    const limited = rateLimitResponse(`upload-image:${userId}`, 60, 10 * 60 * 1000);
    if (limited) return limited;
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Login diperlukan." }, { status: 401 });
  }

  const profile = await socialQuery<{ handle: string; team_name: string; storage_handle: string | null; status: string }>(
    "select handle, team_name, storage_handle, status from scanlator_profiles where user_id = $1 limit 1",
    [userId],
  );
  const me = profile.rows[0];
  if (!me || me.status === "revoked") return NextResponse.json({ error: "Kamu belum Scanlator aktif." }, { status: 403 });
  if (me.status === "suspended") return NextResponse.json({ error: "Akun Scanlator kamu sedang disuspend." }, { status: 403 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file") as File | null;
  const rawKind = String(formData?.get("kind") || "chapter");
  const kind = rawKind === "cover" || rawKind === "avatar" ? rawKind : "chapter";
  const slugRaw = typeof formData?.get("slug") === "string" ? String(formData.get("slug")) : "";
  const doWatermark = formData?.get("watermark") === "true";

  if (!file) return NextResponse.json({ error: "File gambar tidak ditemukan." }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "File harus berupa gambar." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Maksimal 30 MB per gambar." }, { status: 400 });
  console.log(`[scanlator/upload-image] file="${file.name}" type="${file.type}" size=${file.size} kind=${kind} slug=${slugRaw} watermark=${doWatermark} user=${userId}`);

  const slug = slugRaw.replace(/[\\/]+/g, "-").replace(/\.+/g, ".").replace(/[^\w.\- ]+/g, "").trim().slice(0, 80) || me.handle;
  // Kuota 2 GB per Scanlator (dihitung dari prefix R2 miliknya).
  const storage = me.storage_handle || me.handle;
  const usage = await getScanlatorUsage(storage);
  if (usage.usedBytes + file.size > SCANLATOR_QUOTA_BYTES) {
    const sisa = Math.max(0, SCANLATOR_QUOTA_BYTES - usage.usedBytes);
    return NextResponse.json(
      {
        error: `Kuota storage habis. Terpakai ${formatBytes(usage.usedBytes)} dari ${formatBytes(SCANLATOR_QUOTA_BYTES)}, sisa ${formatBytes(sisa)}. Hapus chapter lama untuk mengosongkan.`,
        usedBytes: usage.usedBytes,
        limitBytes: SCANLATOR_QUOTA_BYTES,
      },
      { status: 413 },
    );
  }

  const target = targetById(undefined);

  let buffer: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    // flatten: gambar hasil kanvas browser selalu RGBA; mengenkode WebP
    // ber-alpha dengan effort 6 bisa 30x lebih lambat (75s vs 2.4s untuk
    // 4 MB) dan memicu timeout. Halaman scanlation opakat, jadi latar putih
    // aman dan hampir selalu tidak terlihat.
    let pipeline = sharp(input).rotate().flatten({ background: "#ffffff" });
    if (doWatermark) {
      const meta = await pipeline.metadata();
      const w = Math.max(1, Math.floor((meta.width || 800) * 0.06));
      const svg = `<svg width="${meta.width || 800}" height="${meta.height || 1200}" xmlns="http://www.w3.org/2000/svg"><text x="50%" y="97%" font-size="${w}" fill="rgba(255,255,255,0.55)" font-family="sans-serif" text-anchor="middle">${escapeXml(me.team_name)}</text></svg>`;
      pipeline = pipeline.composite([{ input: Buffer.from(svg), gravity: "south" }]);
    }
    // Kualitas 95 + effort 6, sama seperti converter RyukomikBot (dimensi tetap).
    buffer = await pipeline.webp({ quality: 95, effort: 6 }).toBuffer();
  } catch (err) {
    console.error("[scanlator/upload-image] sharp gagal:", err instanceof Error ? err.message : err, err instanceof Error ? err.stack : "", `file="${file.name}" type="${file.type}" size=${file.size} watermark=${doWatermark}`);
    // Cadangan: kalau sharp tidak bisa memproses gambar ini (format langka /
    // korup), unggah file aslinya supaya Scanlator tidak mentok. WebP/watermark
    // dilewati — lebih baik gambar ada daripada gagal upload.
    try {
      const raw = Buffer.from(await file.arrayBuffer());
      const ext = ((file.name.split(".").pop() || "img").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "img");
      const key = `scanlator/${storage}/${slug}/${kind}/${randomUUID()}.${ext}`;
      await target.client.send(new PutObjectCommand({
        Bucket: target.bucket,
        Key: key,
        Body: raw,
        ContentType: file.type || "application/octet-stream",
        CacheControl: "public, max-age=31536000, immutable",
      }));
      console.warn(`[scanlator/upload-image] fallback asli terpakai: ${key}`);
      return NextResponse.json({ success: true, url: `${target.publicBase}/${key}` });
    } catch (err2) {
      console.error("[scanlator/upload-image] fallback asli gagal:", err2 instanceof Error ? err2.message : err2);
      return NextResponse.json({ error: "Gambar tidak valid atau tidak bisa diproses." }, { status: 400 });
    }
  }

  const key = `scanlator/${storage}/${slug}/${kind}/${randomUUID()}.webp`;
  try {
    await target.client.send(new PutObjectCommand({
      Bucket: target.bucket,
      Key: key,
      Body: buffer,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    }));
  } catch (err) {
    console.error("[scanlator/upload-image] R2 gagal:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Upload ke storage gagal. Coba lagi." }, { status: 502 });
  }

  const url = `${target.publicBase}/${key}`;
  return NextResponse.json({ success: true, url });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
