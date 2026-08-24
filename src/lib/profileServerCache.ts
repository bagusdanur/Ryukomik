import "server-only";

import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseServer";

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
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, username, avatar_url, level, xp, role, is_premium, created_at, total_comments, show_public_reads, show_public_comments, show_public_join_date",
      )
      .ilike("username", username)
      .limit(1);

    if (error) throw error;
    return ((data || [])[0] as PublicProfileRow | undefined) || null;
  },
  ["public-profile-by-username-v1"],
  { revalidate: 300, tags: ["public-profile"] },
);

export const getXpLeadersCached = unstable_cache(
  async (limit = 3): Promise<XpLeaderRow[]> => {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .order("xp", { ascending: false })
      .limit(limit);

    if (error) return [];
    return (data || []) as XpLeaderRow[];
  },
  ["xp-leaders-v1"],
  { revalidate: 3600, tags: ["xp-leaders", "comment-badges"] },
);
