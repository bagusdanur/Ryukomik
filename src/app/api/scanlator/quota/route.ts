import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { getScanlatorUsage, SCANLATOR_QUOTA_BYTES, formatBytes } from "@/lib/scanlatorQuota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Pemakaian kuota storage Scanlator untuk indikator di studio. */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const profile = await socialQuery<{ handle: string; storage_handle: string | null }>(
      "select handle, storage_handle from scanlator_profiles where user_id = $1 limit 1",
      [userId],
    );
    const me = profile.rows[0];
    if (!me) return NextResponse.json({ error: "Kamu belum Scanlator aktif." }, { status: 403 });

    const usage = await getScanlatorUsage(me.storage_handle || me.handle);
    return NextResponse.json(
      {
        success: true,
        usedBytes: usage.usedBytes,
        limitBytes: SCANLATOR_QUOTA_BYTES,
        fileCount: usage.fileCount,
        usedLabel: formatBytes(usage.usedBytes),
        limitLabel: formatBytes(SCANLATOR_QUOTA_BYTES),
        percent: Math.min(100, Math.round((usage.usedBytes / SCANLATOR_QUOTA_BYTES) * 100)),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal menghitung kuota." }, { status: 500 });
  }
}
