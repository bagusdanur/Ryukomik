import { NextResponse } from "next/server";
import {
  getAwardedTitleRushWinnersDetailed,
  getTitleRushLeaderboard,
  getTitleRushWinnerHistory,
} from "@/lib/social/titleRushStore";

type ScoreRow = {
  id: string;
  user_id: string;
  score: number;
  total_rounds: number;
  best_streak: number;
  week_start: string;
  updated_at?: string | null;
  profiles?: {
    username?: string | null;
    avatar_url?: string | null;
    role?: string | null;
    is_premium?: boolean | null;
  } | null;
};

type WinnerRow = ScoreRow & {
  rank?: number;
  prize_days?: number;
  awarded_at?: string | null;
  premium_until?: string | null;
};

function getCurrentWeekStart() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const jakarta = new Date(utc + 7 * 60 * 60000);
  const day = jakarta.getDay() || 7;
  jakarta.setDate(jakarta.getDate() - day + 1);
  jakarta.setHours(0, 0, 0, 0);
  return jakarta.toISOString().slice(0, 10);
}

function getPreviousWeekStart(currentWeekStart: string) {
  const date = new Date(`${currentWeekStart}T00:00:00+07:00`);
  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
}

function getActiveTitleSince() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

function mapScoreRow(row: ScoreRow, index: number) {
  return {
    rank: index + 1,
    user_id: row.user_id,
    score: row.score,
    total_rounds: row.total_rounds,
    best_streak: row.best_streak,
    week_start: row.week_start,
    updated_at: row.updated_at || row.week_start,
    username: row.profiles?.username || `User_${row.user_id.slice(0, 4)}`,
    avatar_url: row.profiles?.avatar_url || null,
    role: row.profiles?.role || null,
    is_premium: Boolean(row.profiles?.is_premium),
  };
}

async function getActiveTitleWinners(limit = 3) {
  const data = await getAwardedTitleRushWinnersDetailed(getActiveTitleSince(), limit);
  return (data as unknown as WinnerRow[]).map((row, index) => ({
    ...mapScoreRow(
      {
        ...row,
        updated_at: row.awarded_at || row.week_start,
      },
      index,
    ),
    rank: row.rank || index + 1,
  }));
}

export async function GET() {
  try {
    const weekStart = getCurrentWeekStart();
    const data = await getTitleRushLeaderboard(weekStart, 10);
    const rows = ((data || []) as unknown as ScoreRow[]).map(mapScoreRow);
    const previousWeekStart = getPreviousWeekStart(weekStart);
    const activeWinners = await getActiveTitleWinners(3);

    const historyData = await getTitleRushWinnerHistory(weekStart, 80);

    const grouped = new Map<string, WinnerRow[]>();
    for (const row of (historyData || []) as unknown as WinnerRow[]) {
      const group = grouped.get(row.week_start) || [];
      if (group.length >= 3) continue;
      group.push({
        ...row,
        updated_at: row.awarded_at || row.week_start,
      });
      grouped.set(row.week_start, group);
    }

    const history = Array.from(grouped.entries())
      .slice(0, 6)
      .map(([historyWeek, weekRows]) => ({
        week_start: historyWeek,
        winners: weekRows.map((row, index) => ({
          ...mapScoreRow(row, index),
          rank: row.rank || index + 1,
        })),
      }));

    return NextResponse.json(
      {
        week_start: weekStart,
        active_title_week: previousWeekStart,
        active_winners: activeWinners,
        history,
        rows,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
