import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tandai reservasi kuota sebagai committed setelah PUT ke R2 berhasil.
 * Bila dipanggil tanpa key, semua reservasi milik user ditandai committed
 * (dipakai saat klien gagal melacak key).
 */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const limited = rateLimitResponse(`upload-commit:${userId}`, 400, 10 * 60 * 1000);
    if (limited) return limited;
    // Baris `scanlator_uploads` ditulis presign dengan storage_handle (bukan
    // handle tampilan). Tim yang pernah ganti handle punya keduanya berbeda,
    // dan dulu commit-nya tidak pernah cocok → slot kuota nyangkut 30 menit.
    const profile = await socialQuery<{ handle: string; storage_handle: string | null }>(
      "select handle, storage_handle from scanlator_profiles where user_id = $1 limit 1",
      [userId],
    );
    const handle = profile.rows[0]?.storage_handle || profile.rows[0]?.handle;
    if (!handle) return NextResponse.json({ error: "Kamu belum Scanlator aktif." }, { status: 403 });

    const body = (await request.json().catch(() => null)) as { key?: string } | null;
    const key = typeof body?.key === "string" ? body.key.slice(0, 300) : "";

    if (key) {
      await socialQuery(
        "update scanlator_uploads set status = 'committed' where handle = $1 and object_key = $2",
        [handle, key],
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal menandai upload." }, { status: 500 });
  }
}
