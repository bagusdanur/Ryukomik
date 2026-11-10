import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { targetById } from "@/lib/r2Targets";
import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { getScanlatorUsage, SCANLATOR_QUOTA_BYTES, formatBytes } from "@/lib/scanlatorQuota";
import { rateLimitResponse } from "@/lib/rateLimit";
import { isSafeImageType } from "@/lib/imageTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Presigned upload untuk Scanlator — sama seperti dashboard Project:
 * browser mengunggah langsung ke R2 (tidak lewat server), jadi file besar
 * tidak kena batas body nginx dan tidak memakan waktu server.
 */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const limited = rateLimitResponse(`presign:${userId}`, 200, 5 * 60 * 1000);
    if (limited) return limited;
    const profile = await socialQuery<{ handle: string; storage_handle: string | null; status: string }>(
      "select handle, storage_handle, status from scanlator_profiles where user_id = $1 limit 1",
      [userId],
    );
    const me = profile.rows[0];
    const storage = me?.storage_handle || me?.handle || "";
    if (!me || me.status === "revoked") {
      return NextResponse.json({ error: "Kamu belum Scanlator aktif." }, { status: 403 });
    }
    if (me.status === "suspended") {
      return NextResponse.json({ error: "Akun Scanlator kamu sedang disuspend." }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as
      | { filename?: string; contentType?: string; slug?: string; kind?: string; size?: number }
      | null;

    const filename = String(body?.filename || "").slice(0, 200);
    const contentType = String(body?.contentType || "");
    const kind = body?.kind === "cover" || body?.kind === "avatar" ? String(body.kind) : "chapter";
    const size = Number(body?.size || 0);
    const slug = String(body?.slug || me.handle).replace(/[^a-zA-Z0-9\-_]/g, "").slice(0, 80) || me.handle;

    if (!filename) return NextResponse.json({ error: "Nama file tidak valid." }, { status: 400 });
    if (!isSafeImageType(contentType)) {
      return NextResponse.json(
        { error: "Format harus JPG, PNG, WebP, AVIF, atau GIF." },
        { status: 400 },
      );
    }

    const MAX_BYTES = 30 * 1024 * 1024;
    if (size > MAX_BYTES) {
      return NextResponse.json({ error: `Maksimal 30 MB per gambar (file ini ${formatBytes(size)}).` }, { status: 400 });
    }

    // Kuota 2 GB per user — termasuk slot yang sedang dipesan upload lain.
    await socialQuery(
      "update scanlator_uploads set status = 'expired' where handle = $1 and status = 'reserved' and expires_at < now()",
      [storage],
    );
    const reservedRow = await socialQuery<{ reserved: string }>(
      "select coalesce(sum(bytes), 0)::text as reserved from scanlator_uploads where handle = $1 and status = 'reserved' and expires_at > now()",
      [storage],
    );
    const reservedBytes = Number(reservedRow.rows[0]?.reserved || 0);

    const usage = await getScanlatorUsage(storage);
    if (usage.usedBytes + reservedBytes + size > SCANLATOR_QUOTA_BYTES) {
      const sisa = Math.max(0, SCANLATOR_QUOTA_BYTES - usage.usedBytes - reservedBytes);
      return NextResponse.json(
        { error: `Kuota storage habis. Terpakai ${formatBytes(usage.usedBytes)} dari ${formatBytes(SCANLATOR_QUOTA_BYTES)}, sisa ${formatBytes(sisa)}.` },
        { status: 413 },
      );
    }

    const target = targetById(undefined);
    const ext = (filename.split(".").pop() || "webp").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
    const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const key = `scanlator/${storage}/${slug}/${kind}/${unique}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: target.bucket,
      Key: key,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });
    const presignedUrl = await getSignedUrl(target.client, command, {
      expiresIn: 600,
      unhoistableHeaders: new Set(["x-amz-checksum-crc32", "x-amz-sdk-checksum-algorithm"]),
    });

    // Pesan slot kuota selama 30 menit; ditandai committed setelah PUT sukses.
    await socialQuery(
      "insert into scanlator_uploads (handle, object_key, bytes) values ($1, $2, $3) on conflict (object_key) do nothing",
      [storage, key, size],
    );

    return NextResponse.json({ presignedUrl, publicUrl: `${target.publicBase}/${key}`, key });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[scanlator/presign] gagal:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Gagal menyiapkan upload." }, { status: 500 });
  }
}
