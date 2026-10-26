import "server-only";

import { unstable_cache } from "next/cache";
import { socialQuery } from "@/lib/social/db";

export type PublicProfileRow = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  level?: number | null;
  xp?: number | null;
  role?: string | null;
  is_premium?: boolean | null;
  created_at?: string | null;
  total_comments?: number | null;
  show_public_reads?: boolean | null;
  show_public_comments?: boolean | null;
  show_public_join_date?: boolean | null;
};

export type XpLeaderRow = {
  id: string;
};

export const getPublicProfileByUsernameCached = unstable_cache(
  async (username: string): Promise<PublicProfileRow | null> => {
    // Sumber lokal (social_profiles): nol egress Supabase.
    const { rows } = await socialQuery<PublicProfileRow>(
      `select user_id as id, username, avatar_url, level, xp, role, is_premium,
              created_at, total_comments, show_public_reads, show_public_comments,
              show_public_join_date
         from social_profiles
        where lower(username) = lower($1)
        limit 1`,
      [username],
    );
    return rows[0] || null;
  },
  ["public-profile-by-username-v2"],
  // Tag di-invalidate saat admin mengubah profil/user; TTL 1 jam (dari 5 menit)
  // memangkas query profiles dari halaman /u/ yang ramai.
  { revalidate: 3600, tags: ["public-profile"] },
);

export const getXpLeadersCached = unstable_cache(
  async (limit = 3): Promise<XpLeaderRow[]> => {
    try {
      const { rows } = await socialQuery<XpLeaderRow>(
        "select user_id as id from social_profiles order by xp desc limit $1",
        [limit],
      );
      return rows;
    } catch {
      return [];
    }
  },
  ["xp-leaders-v2"],
  { revalidate: 7200, tags: ["xp-leaders", "comment-badges"] },
);
