import "server-only";

import { socialQuery } from "@/lib/social/db";

/**
 * Penulisan kolom profil ke database LOKAL (satu-satunya sumber sejak irisan 2).
 *
 * Semua field dicatat di profile_write_log untuk audit sekaligus jurnal rollback.
 * Tidak menyentuh Supabase sama sekali.
 */
const ALLOWED = new Set([
  "username",
  "avatar_url",
  "banner_url",
  "bio",
  "level",
  "xp",
  "role",
  "is_premium",
  "premium_until",
  "total_reads",
  "total_comments",
  "is_banned",
  "banned_until",
  "ban_reason",
  "banned_at",
  "banned_by",
  "show_public_reads",
  "show_public_comments",
  "show_public_join_date",
]);

export async function updateLocalProfile(
  userId: string,
  fields: Record<string, unknown>,
  actor = "system",
): Promise<void> {
  const entries = Object.entries(fields).filter(([key]) => ALLOWED.has(key));
  if (!userId || !entries.length) return;

  await socialQuery(
    "insert into social_profiles (user_id, username) values ($1,$2) on conflict (user_id) do nothing",
    [userId, `user-${userId.slice(0, 8)}`],
  );
  const assignments = entries.map(([key], index) => `${key} = $${index + 2}`);
  await socialQuery(
    `update social_profiles set ${assignments.join(", ")}, updated_at = now() where user_id = $1`,
    [userId, ...entries.map(([, value]) => value)],
  );
  await socialQuery("insert into profile_write_log (user_id, fields, actor) values ($1,$2,$3)", [
    userId,
    JSON.stringify(Object.fromEntries(entries)),
    actor,
  ]);
}
