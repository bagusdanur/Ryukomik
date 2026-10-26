import "server-only";

import { supabaseAdmin } from "@/lib/supabaseServer";
import { socialQuery } from "@/lib/social/db";

/**
 * IRISAN 2: profil lokal sudah menjadi sumber data.
 *
 * Fungsi ini TIDAK lagi menyegarkan profil tiap 30 menit (itu sumber 5.822
 * query/hari ke Supabase). Sekarang ia hanya:
 *   1. memastikan baris lokal ada, dan
 *   2. untuk user yang belum punya baris lokal (pendaftar baru), mengambil
 *      SATU baris dari Supabase sekali sebagai bootstrap.
 *
 * Jadi egress hanya terjadi saat ada user baru, bukan berulang.
 */

type SourceProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  level: number | null;
  role: string | null;
  is_premium: boolean | null;
  total_reads: number | null;
  total_comments: number | null;
};

export async function ensureSocialProfile(userId: string) {
  const existing = await socialQuery<{ user_id: string }>(
    "select user_id from social_profiles where user_id = $1",
    [userId],
  );
  if (existing.rows.length) return;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, username, avatar_url, banner_url, bio, level, role, is_premium, total_reads, total_comments")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;

  await upsertSocialProfile(data as SourceProfile);
}

export async function upsertSocialProfile(profile: SourceProfile) {
  const username = profile.username || `user-${profile.id.slice(0, 8)}`;
  await socialQuery(
    `insert into social_profiles (user_id, username, avatar_url, banner_url, bio, level, role, is_premium, total_reads, total_comments, source_updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     on conflict (user_id) do nothing`,
    [profile.id, username, profile.avatar_url, profile.banner_url,
      profile.bio, profile.level || 1, profile.role, Boolean(profile.is_premium),
      profile.total_reads || 0, profile.total_comments || 0, new Date().toISOString()],
  );
  await Promise.all([
    socialQuery("update social_activity_events set actor_name=$2 where actor_id=$1 and actor_name is distinct from $2", [profile.id, username]),
    socialQuery("update social_notifications set actor_name=$2 where actor_id=$1 and actor_name is distinct from $2", [profile.id, username]),
  ]);
}
