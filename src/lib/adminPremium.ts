import "server-only";

import { computePremiumUntil } from "@/lib/requestAuthPolicy";
import { socialQuery } from "@/lib/social/db";
import { bumpProfileSignal } from "@/lib/social/profileSignals";
import { updateLocalProfile } from "@/lib/social/profileWrite";

/**
 * Tambah masa premium user. Dipakai hadiah event (Marathon) supaya logika
 * "stacking" premium tetap satu sumber dengan fitur admin lainnya.
 */
export async function grantPremiumDays(userId: string, days: number): Promise<string | null> {
  const safeDays = Math.floor(Number(days) || 0);
  if (safeDays <= 0) return null;

  // Baca & tulis premium dari database lokal (sumber tunggal sejak irisan 2).
  const { rows } = await socialQuery<{ premium_until: string | null }>(
    "select premium_until from social_profiles where user_id = $1",
    [userId],
  );

  const premiumUntil = computePremiumUntil(rows[0]?.premium_until ?? null, Math.min(safeDays, 3650));

  await updateLocalProfile(userId, { is_premium: true, premium_until: premiumUntil }, "adminPremium");
  await bumpProfileSignal(userId);
  return premiumUntil;
}
