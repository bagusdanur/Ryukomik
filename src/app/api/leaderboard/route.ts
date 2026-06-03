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
  title_rush_rank?: number | null;
  xp_rank?: number | null;
}

const getLeaderboardCached = unstable_cache(
  async () => {
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, username, avatar_url, xp, level, role, is_premium")
      .order("xp", { ascending: false })
      .limit(10);

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

    return profileRows.map((p, index) => ({
      ...p,
      xp_rank: index + 1,
      title_rush_rank: titleRank[p.id] || null,
    }));
  },
  ["leaderboard-v2"],
  { revalidate: 600, tags: ["leaderboard"] },
);

export async function GET() {
  try {
    const result = await getLeaderboardCached();

    const res = NextResponse.json(result);
    res.headers.set(
      "Cache-Control",
      "public, s-maxage=600, stale-while-revalidate=600"
    );
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
