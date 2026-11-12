import type { PoolClient } from "pg";

import { socialQuery } from "@/lib/social/db";

/**
 * Benefit premium untuk Scanlator.
 *
 * Penting: sumber kebenaran premium di seluruh aplikasi adalah boolean
 * `social_profiles.is_premium` (badge VIP, chapter premium, kuota download,
 * notifikasi audience "premium"). Jalur Scanlator dulu hanya menulis
 * `premium_until` + `premium_source`, sehingga masa aktif tercatat tapi badge
 * VIP tidak pernah muncul. Semua penulisan sekarang lewat helper ini supaya
 * tiga kolom itu selalu konsisten.
 */

export const SCANLATOR_PREMIUM_DAYS = 365;

type Runner = Pick<PoolClient, "query">;

function runner(client?: Runner): Runner {
  return client ?? ({ query: socialQuery } as unknown as Runner);
}

/** Aktifkan premium Scanlator: set is_premium + perpanjang premium_until. */
export async function grantScanlatorPremium(userId: string, client?: Runner): Promise<void> {
  await runner(client).query(
    `update social_profiles
        set is_premium = true,
            premium_until = case
              when premium_until is not null and premium_until > now() then premium_until
              else now() + interval '${SCANLATOR_PREMIUM_DAYS} days'
            end,
            premium_source = case
              when premium_until is not null and premium_until > now() and premium_source is not null then premium_source
              else 'scanlator'
            end,
            updated_at = now()
      where user_id = $1`,
    [userId],
  );
}

/**
 * Cabut benefit premium Scanlator. Premium yang dibeli sendiri (source selain
 * 'scanlator') tidak disentuh sama sekali.
 */
export async function revokeScanlatorPremium(userId: string, client?: Runner): Promise<void> {
  await runner(client).query(
    `update social_profiles
        set is_premium = case when premium_source = 'scanlator' then false else is_premium end,
            premium_until = case when premium_source = 'scanlator' then null else premium_until end,
            premium_source = case when premium_source = 'scanlator' then null else premium_source end,
            updated_at = now()
      where user_id = $1`,
    [userId],
  );
}

/**
 * Turunkan premium yang sudah lewat masa aktif.
 *
 * Banyak gate masih membaca `is_premium` mentah (mis. kuota download), jadi
 * boolean harus ikut turun saat `premium_until` lewat — bukan hanya dihitung
 * di `isStillPremium()` pada saat render.
 */
export async function sweepExpiredPremium(): Promise<number> {
  const { rows } = await socialQuery<{ user_id: string }>(
    `update social_profiles
        set is_premium = false, updated_at = now()
      where is_premium = true
        and premium_until is not null
        and premium_until <= now()
      returning user_id`,
  );
  return rows.length;
}
