import { NextResponse } from "next/server";
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

interface ReadRow {
  user_id: string;
}

export async function GET() {
  try {
    // Ambil profiles top 10
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, username, avatar_url, xp, level, role, is_premium")
      .order("xp", { ascending: false })
      .limit(10);

    if (error) throw error;

    // Hitung total chapter dibaca per user
    const profileRows = (profiles || []) as LeaderboardProfile[];
    const ids = profileRows.map((p) => p.id);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: reads }, { data: titleWinners }] = await Promise.all([
      supabaseAdmin
        .from("user_reads")
        .select("user_id")
        .in("user_id", ids),
      supabaseAdmin
        .from("title_rush_winners")
        .select("user_id, rank")
        .not("awarded_at", "is", null)
        .gte("awarded_at", since)
        .in("user_id", ids),
    ]);

    // Count per user_id
    const readCount: Record<string, number> = {};
    ((reads || []) as ReadRow[]).forEach((r) => {
      readCount[r.user_id] = (readCount[r.user_id] || 0) + 1;
    });
    const titleRank: Record<string, number> = {};
    ((titleWinners || []) as Array<{ user_id: string; rank: number }>).forEach((winner) => {
      titleRank[winner.user_id] = winner.rank;
    });

    const result = profileRows.map((p, index) => ({
      ...p,
      xp_rank: index + 1,
      total_reads: readCount[p.id] || 0,
      title_rush_rank: titleRank[p.id] || null,
    }));

    const res = NextResponse.json(result);
    res.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600"
    );
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
