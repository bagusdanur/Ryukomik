import "server-only";

import { supabaseAdmin } from "@/lib/supabaseServer";
import { socialQuery } from "@/lib/social/db";

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
  const existing = await socialQuery<{ source_updated_at: string | null }>("select source_updated_at from social_profiles where user_id = $1", [userId]);
  const lastSync = existing.rows[0]?.source_updated_at;
  // Profile writes sync explicitly; this periodic read only repairs drift.
  if (lastSync && Date.now() - new Date(lastSync).getTime() < 30 * 60 * 1000) return;
  const { data, error } = await supabaseAdmin.from("profiles")
    .select("id, username, avatar_url, banner_url, bio, level, role, is_premium, total_reads, total_comments")
    .eq("id", userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("PROFILE_NOT_FOUND");
  await upsertSocialProfile(data as SourceProfile);
}

export async function upsertSocialProfile(profile: SourceProfile) {
  const username = profile.username || `user-${profile.id.slice(0, 8)}`;
  await socialQuery(
    // Irisan 1: username & avatar_url sudah DIMILIKI database lokal (diubah
    // lewat /api/me/profile), jadi repair tidak boleh menimpanya lagi. Kolom
    // yang masih bersumber Supabase (level/premium/dsb.) tetap disegarkan
    // sampai irisan 2 memindahkan penulisannya.
    `insert into social_profiles (user_id, username, avatar_url, banner_url, bio, level, role, is_premium, total_reads, total_comments, source_updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     on conflict (user_id) do update set
       level=excluded.level, role=excluded.role, is_premium=excluded.is_premium,
       total_reads=excluded.total_reads, total_comments=excluded.total_comments,
       source_updated_at=now(), updated_at=now()`,
    [profile.id, username, profile.avatar_url, profile.banner_url,
      profile.bio, profile.level || 1, profile.role, Boolean(profile.is_premium),
      profile.total_reads || 0, profile.total_comments || 0, new Date().toISOString()],
  );
  await Promise.all([
    socialQuery("update social_activity_events set actor_name=$2 where actor_id=$1 and actor_name is distinct from $2", [profile.id, username]),
    socialQuery("update social_notifications set actor_name=$2 where actor_id=$1 and actor_name is distinct from $2", [profile.id, username]),
  ]);
}
