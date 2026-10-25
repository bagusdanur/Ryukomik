import "server-only";

import { computePremiumUntil } from "@/lib/requestAuthPolicy";
import { supabaseAdmin } from "@/lib/supabaseServer";

/**
 * Tambah masa premium user. Dipakai hadiah event (Marathon) supaya logika
 * "stacking" premium tetap satu sumber dengan fitur admin lainnya.
 */
export async function grantPremiumDays(userId: string, days: number): Promise<string | null> {
  const safeDays = Math.floor(Number(days) || 0);
  if (safeDays <= 0) return null;

  const { data: current, error: readError } = await supabaseAdmin
    .from("profiles")
    .select("premium_until")
    .eq("id", userId)
    .maybeSingle();
  if (readError) throw readError;

  const premiumUntil = computePremiumUntil(
    (current as { premium_until?: string | null } | null)?.premium_until ?? null,
    Math.min(safeDays, 3650),
  );

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ is_premium: true, premium_until: premiumUntil })
    .eq("id", userId);
  if (error) throw error;

  return premiumUntil;
}
