import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

import { targetById } from "@/lib/r2Targets";
import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
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
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Login diperlukan." }, { status: 401 });
  }

  const profile = await socialQuery<{ handle: string; team_name: string; status: string }>(
    "select handle, team_name, status from scanlator_profiles where user_id = $1 limit 1",
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

  const slug = slugRaw.replace(/[\\/]+/g, "-").replace(/\.\.+/g, ".").replace(/[^\w.\- ]+/g, "").trim().slice(0, 80) || me.handle;

  const target = targetById(undefined);

  let buffer: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    let pipeline = sharp(input).rotate();
    if (doWatermark) {
      const meta = await pipeline.metadata();
      const w = Math.max(1, Math.floor((meta.width || 800) * 0.06));
      const svg = `<svg width="${meta.width || 800}" height="${meta.height || 1200}" xmlns="http://www.w3.org/2000/svg"><text x="50%" y="97%" font-size="${w}" fill="rgba(255,255,255,0.55)" font-family="sans-serif" text-anchor="middle">${escapeXml(me.team_name)}</text></svg>`;
      pipeline = pipeline.composite([{ input: Buffer.from(svg), gravity: "south" }]);
    }
    buffer = await pipeline.webp({ quality: 82 }).toBuffer();
  } catch {
    return NextResponse.json({ error: "Gambar tidak valid atau tidak bisa diproses." }, { status: 400 });
  }

  const key = `scanlator/${me.handle}/${slug}/${kind}/${randomUUID()}.webp`;
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
