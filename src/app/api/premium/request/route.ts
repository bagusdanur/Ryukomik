import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/social/auth";
import { authErrorResponse } from "@/lib/social/authResponse";
import { socialQuery } from "@/lib/social/db";

export const runtime = "nodejs";

/** Status request premium terakhir milik user (dipakai UI untuk cek pending). */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const [latest, pending] = await Promise.all([
      socialQuery<{ id: string; status: string }>(
        "select id::text as id, status from premium_requests where user_id = $1 order by created_at desc limit 1",
        [userId],
      ),
      socialQuery<{ id: string }>(
        "select id::text as id from premium_requests where user_id = $1 and status = 'pending' limit 1",
        [userId],
      ),
    ]);
    return NextResponse.json(
      { request: latest.rows[0] ?? null, pending: pending.rows[0] ?? null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal memeriksa request premium." }, { status: 500 });
  }
}

/** Kirim bukti pembayaran manual (pengganti insert langsung ke Supabase). */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = (await request.json().catch(() => null)) as
      | { proofUrl?: unknown; packageName?: unknown; durationDays?: unknown; amount?: unknown }
      | null;

    const proofUrl = typeof body?.proofUrl === "string" ? body.proofUrl.trim() : "";
    if (!proofUrl.startsWith("https://") || proofUrl.length > 2048) {
      return NextResponse.json({ error: "Bukti pembayaran wajib URL HTTPS." }, { status: 400 });
    }

    const packageName = typeof body?.packageName === "string" ? body.packageName.slice(0, 80) : null;
    const durationDays = Number.isFinite(Number(body?.durationDays)) ? Math.max(1, Math.floor(Number(body?.durationDays))) : null;
    const amount = Number.isFinite(Number(body?.amount)) ? Math.max(0, Math.floor(Number(body?.amount))) : null;

    const { rows: profileRows } = await socialQuery<{ username: string | null }>(
      "select username from social_profiles where user_id = $1",
      [userId],
    );
    const name = profileRows[0]?.username || "User";

    const { rows } = await socialQuery<{ id: string }>(
      `insert into premium_requests (user_id, name, proof_url, status, package_name, duration_days, amount, sk_agreed, sk_agreed_at)
       values ($1, $2, $3, 'pending', $4, $5, $6, true, now())
       returning id::text as id`,
      [userId, name, proofUrl, packageName, durationDays, amount],
    );

    return NextResponse.json({ success: true, id: rows[0].id });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[premium-request] gagal:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Gagal mengirim permintaan premium." }, { status: 500 });
  }
}
