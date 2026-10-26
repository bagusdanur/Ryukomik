import "server-only";

import { socialQuery } from "@/lib/social/db";

/**
 * Sinyal perubahan profil (premium/role/ban) untuk browser user yang online.
 *
 * Ditulis HANYA ke database lokal — tidak membaca/menulis Supabase sama sekali,
 * jadi tidak menambah egress. Klien mem-poll endpoint kecil kita (60 detik) dan
 * hanya me-refresh profilnya sendiri saat versi berubah.
 */
export async function bumpProfileSignal(userId: string): Promise<void> {
  if (!userId) return;
  try {
    await socialQuery(
      `insert into profile_change_signals (user_id, version) values ($1, 1)
       on conflict (user_id) do update
         set version = profile_change_signals.version + 1,
             updated_at = now()`,
      [userId],
    );
  } catch (error) {
    // Sinyal bersifat pelengkap: jangan menggagalkan alur premium/role.
    console.error("[profile-signal] bump gagal:", error instanceof Error ? error.message : error);
  }
}

export async function getProfileSignal(userId: string): Promise<number> {
  const result = await socialQuery<{ version: string }>(
    "select version from profile_change_signals where user_id = $1",
    [userId],
  );
  return Number(result.rows[0]?.version || 0);
}
