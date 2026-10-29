import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/social/auth";
import { computePremiumUntil } from "@/lib/requestAuthPolicy";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { bumpProfileSignal } from "@/lib/social/profileSignals";
import { updateLocalProfile } from "@/lib/social/profileWrite";
import { socialQuery } from "@/lib/social/db";
import { authErrorResponse } from "@/lib/social/authResponse";

export const dynamic = "force-dynamic";

/**
 * Redeem a premium code server-side.
 *
 * The old flow read `premium_codes` and wrote `profiles` straight from the
 * browser, so (a) the table had to stay readable/writable for every client and
 * (b) two users could redeem the same code concurrently. Here the claim is a
 * single conditional UPDATE, which is atomic in Postgres, and the premium grant
 * uses the service role so no client needs table access.
 */
export async function POST(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { code?: string };
    const code = String(body.code || "").trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: "Masukkan kode premium" }, { status: 400 });
    }

    // Atomic claim: only succeeds if the code is unused at this instant.
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("premium_codes")
      .update({ used: true, used_by: userId, used_at: new Date().toISOString() })
      .eq("code", code)
      .eq("used", false)
      .select("id, duration_days");

    if (claimError) throw claimError;
    const row = (claimed || [])[0] as { id: string; duration_days: number } | undefined;
    if (!row) {
      return NextResponse.json({ error: "Kode tidak valid atau sudah dipakai" }, { status: 400 });
    }

    // Premium dibaca & ditulis di database lokal (sumber tunggal sejak irisan 2).
    const { rows: localRows } = await socialQuery<{ premium_until: string | null }>(
      "select premium_until from social_profiles where user_id = $1",
      [userId],
    );
    const premiumUntil = computePremiumUntil(localRows[0]?.premium_until ?? null, row.duration_days);

    try {
      await updateLocalProfile(userId, { is_premium: true, premium_until: premiumUntil }, "premium/redeem");
    } catch (grantError) {
      // Release the code so a transient failure does not burn it.
      await supabaseAdmin
        .from("premium_codes")
        .update({ used: false, used_by: null, used_at: null })
        .eq("id", row.id);
      throw grantError;
    }
    await bumpProfileSignal(userId);

    return NextResponse.json({
      success: true,
      durationDays: row.duration_days,
      premiumUntil,
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengaktifkan premium" },
      { status: 500 },
    );
  }
}
