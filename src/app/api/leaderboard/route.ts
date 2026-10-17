import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseServer";

interface LeaderboardProfile {
  id: string;
  username?: string;
  avatar_url?: string;
  xp?: number;
  level?: number;
  role?: string;
  is_premium?: boolean;
  total_reads?: number;
  total_comments?: number;
  title_rush_rank?: number | null;
  rank?: number;
}

export type LeaderboardCategory = "xp" | "reads" | "comments";

const CATEGORY_FIELD: Record<LeaderboardCategory, keyof LeaderboardProfile> = {
  xp: "xp",
  reads: "total_reads",
  comments: "total_comments",
};

// Satu query yang sama (hanya limit diperbesar), lalu ketiga peringkat diurutkan
// di memori — sengaja begitu supaya TIDAK menambah query Supabase. 30 baris
// teratas XP dipakai untuk ketiga kategori; karena XP lahir dari membaca dan
// berkomentar, top-10 pembaca/komentator praktis selalu ada di dalamnya.
const POOL_SIZE = 30;
const TOP_N = 10;

const getLeaderboardCached = unstable_cache(
  async () => {
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, username, avatar_url, xp, level, role, is_premium, total_reads, total_comments")
      .order("xp", { ascending: false })
      .limit(POOL_SIZE);

    if (error) throw error;

    const profileRows = (profiles || []) as LeaderboardProfile[];
    const ids = profileRows.map((p) => p.id);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: titleWinners } = await supabaseAdmin
      .from("title_rush_winners")
      .select("user_id, rank")
      .not("awarded_at", "is", null)
      .gte("awarded_at", since)
      .in("user_id", ids);

    const titleRank: Record<string, number> = {};
    ((titleWinners || []) as Array<{ user_id: string; rank: number }>).forEach((winner) => {
      titleRank[winner.user_id] = winner.rank;
    });

    const withBadges = profileRows.map((p) => ({
      ...p,
      title_rush_rank: titleRank[p.id] || null,
    }));

    const topBy = (category: LeaderboardCategory) => {
      const field = CATEGORY_FIELD[category];
      return [...withBadges]
        .sort((a, b) => (Number(b[field]) || 0) - (Number(a[field]) || 0))
        .slice(0, TOP_N)
        .map((p, index) => ({ ...p, rank: index + 1 }));
    };

    return {
      xp: topBy("xp"),
      reads: topBy("reads"),
      comments: topBy("comments"),
    };
  },
  ["leaderboard-v3"],
  { revalidate: 3600, tags: ["leaderboard"] },
);

export async function GET() {
  try {
    const result = await getLeaderboardCached();

    const res = NextResponse.json(result);
    res.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=3600",
    );
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
