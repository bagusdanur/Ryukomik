import "server-only";

import { socialQuery } from "@/lib/social/db";

/**
 * Cermin TULIS (bukan sinkron baca) untuk kolom hak akses selama migrasi.
 *
 * Irisan 1 memindahkan identitas ke lokal, sementara penulisan premium/role
 * masih di Supabase (irisan 2). Supaya sinyal realtime dan daftar admin tetap
 * benar, setiap penulisan entitlement juga menulis nilai barunya ke lokal —
 * tanpa membaca Supabase sama sekali, jadi nol egress tambahan.
 *
 * Akan dihapus di irisan 2 saat penulisan entitlement pindah sepenuhnya.
 */
const ALLOWED = new Set([
  "username",
  "avatar_url",
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
]);

export async function mirrorProfileFields(
  userId: string,
  fields: Record<string, unknown>,
  actor = "supabase-write",
): Promise<void> {
  const entries = Object.entries(fields).filter(([key]) => ALLOWED.has(key));
  if (!userId || !entries.length) return;

  try {
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
  } catch (error) {
    // Cermin bersifat pelengkap: jangan menggagalkan alur premium/role.
    console.error("[profile-mirror] gagal:", error instanceof Error ? error.message : error);
  }
}
