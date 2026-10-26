import "server-only";

import { socialQuery } from "@/lib/social/db";

/**
 * Baca data tampilan profil dari database LOKAL sekaligus (batch), untuk
 * menggantikan `join profiles(...)` di Supabase pada jalur komentar.
 *
 * Satu query untuk seluruh halaman — bukan satu query per komentar — dan nol
 * egress Supabase. `xp` sengaja tidak ada di sini: kolom itu hanya hidup di
 * Supabase, jadi UI yang membutuhkannya harus menangani nilai kosong.
 */
export type SocialProfileLite = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  xp: number;
  role: string | null;
  is_premium: boolean;
  total_reads: number;
  avatar_border: string | null;
};

export async function getSocialProfiles(
  userIds: Array<string | null | undefined>,
): Promise<Map<string, SocialProfileLite>> {
  const ids = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));
  if (!ids.length) return new Map();

  try {
    const { rows } = await socialQuery<SocialProfileLite>(
      `select user_id, username, avatar_url, level, coalesce(xp, 0) as xp, role, is_premium,
              coalesce(total_reads, 0) as total_reads, avatar_border
         from social_profiles
        where user_id = any($1::uuid[])`,
      [ids],
    );
    return new Map(rows.map((row) => [String(row.user_id), row]));
  } catch (error) {
    // Data pelengkap tampilan: jangan runtuhkan halaman komentar.
    console.error("[profile-lookup] gagal:", error instanceof Error ? error.message : error);
    return new Map();
  }
}
