import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminApi";
import {
  deleteTitleRushWeek,
  getLockedTitleRushWinners,
  getTitleRushTopScores,
  insertTitleRushWinners,
  listTitleRushWeeks,
  markTitleRushWinnerAwarded,
} from "@/lib/social/titleRushStore";
import { bumpProfileSignal } from "@/lib/social/profileSignals";
import { updateLocalProfile } from "@/lib/social/profileWrite";
import { createSocialNotification } from "@/lib/social/notifications";

type WinnerRow = {
  id?: string;
  user_id: string;
  rank?: number;
  prize_days?: number;
  score: number;
  total_rounds: number;
  best_streak: number;
  week_start: string;
  updated_at?: string | null;
  premium_until?: string | null;
  awarded_at?: string | null;
  profiles?: {
    username?: string | null;
    avatar_url?: string | null;
    premium_until?: string | null;
    is_premium?: boolean | null;
  } | null;
};

const PRIZES = [
  { rank: 1, days: 7 },
  { rank: 2, days: 5 },
  { rank: 3, days: 3 },
] as const;

function getCurrentWeekStart() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const jakarta = new Date(utc + 7 * 60 * 60000);
  const day = jakarta.getDay() || 7;
  jakarta.setDate(jakarta.getDate() - day + 1);
  jakarta.setHours(0, 0, 0, 0);
  return jakarta.toISOString().slice(0, 10);
}

function isValidWeekStart(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getWeekStartFromRequest(request: Request) {
  const url = new URL(request.url);
  const weekStart = url.searchParams.get("week_start");
  return isValidWeekStart(weekStart) ? weekStart : getCurrentWeekStart();
}

async function getEventWeeks() {
  const { scoreWeeks, winnerWeeks } = await listTitleRushWeeks(100);
  const weeks = Array.from(new Set([...scoreWeeks, ...winnerWeeks].filter(Boolean)));
  const currentWeek = getCurrentWeekStart();

  return weeks.includes(currentWeek) ? weeks : [currentWeek, ...weeks];
}

function mapWinner(row: WinnerRow, index: number) {
  const rank = row.rank || index + 1;

  return {
    rank,
    prize_days: row.prize_days || PRIZES[rank - 1]?.days || 0,
    user_id: row.user_id,
    username: row.profiles?.username || `User_${row.user_id.slice(0, 4)}`,
    avatar_url: row.profiles?.avatar_url || null,
    score: row.score,
    total_rounds: row.total_rounds,
    best_streak: row.best_streak,
    week_start: row.week_start,
    updated_at: row.updated_at,
    is_premium: Boolean(row.profiles?.is_premium),
    premium_until: row.premium_until || row.profiles?.premium_until || null,
    awarded_at: row.awarded_at || null,
  };
}

async function getLockedWinners(weekStart: string) {
  const data = await getLockedTitleRushWinners(weekStart);
  return (data as unknown as WinnerRow[]).map((row, index) =>
    mapWinner({ ...row, updated_at: row.awarded_at || row.week_start }, index),
  );
}

async function getWinners(weekStart = getCurrentWeekStart()) {
  const locked = await getLockedWinners(weekStart);
  if (locked.length > 0) {
    return { weekStart, winners: locked };
  }

  const data = await getTitleRushTopScores(weekStart, 3);

  return {
    weekStart,
    winners: (data as unknown as WinnerRow[]).map((row, index) => mapWinner(row, index)),
  };
}

async function lockWinners(weekStart: string) {
  const locked = await getLockedWinners(weekStart);
  if (locked.length > 0) return locked;

  const { winners } = await getWinners(weekStart);
  if (winners.length === 0) return [];

  await insertTitleRushWinners(
    winners.map((winner) => ({
      week_start: weekStart,
      user_id: winner.user_id,
      rank: winner.rank,
      score: winner.score,
      total_rounds: winner.total_rounds,
      best_streak: winner.best_streak,
      prize_days: winner.prize_days,
    })),
  );

  return getLockedWinners(weekStart);
}

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const result = await getWinners(getWeekStartFromRequest(request));
    const weeks = await getEventWeeks();

    return NextResponse.json(
      { ...result, weeks, current_week: getCurrentWeekStart() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = await request.json().catch(() => ({}));
    const requestedWeek = isValidWeekStart(body?.week_start)
      ? body.week_start
      : getCurrentWeekStart();
    const currentWeek = getCurrentWeekStart();
    const debug = body?.debug === true;

    if (requestedWeek === currentWeek && !debug) {
      return NextResponse.json(
        {
          error: "Hadiah belum bisa diberikan karena minggu event masih berjalan.",
          current_week: currentWeek,
        },
        { status: 409 },
      );
    }

    const weekStart = requestedWeek;
    const winners = await lockWinners(weekStart);
    const awarded = [];

    for (const winner of winners) {
      if (!winner.prize_days) continue;
      if (winner.awarded_at) {
        awarded.push(winner);
        continue;
      }

      const now = new Date();
      const currentUntil = winner.premium_until
        ? new Date(winner.premium_until)
        : null;
      const baseUntil =
        currentUntil && currentUntil.getTime() > now.getTime()
          ? currentUntil
          : now;
      const nextUntil = new Date(
        baseUntil.getTime() + winner.prize_days * 24 * 60 * 60 * 1000,
      );

      await updateLocalProfile(
        winner.user_id,
        { is_premium: true, premium_until: nextUntil.toISOString() },
        "title-rush-rewards",
      );
      await bumpProfileSignal(winner.user_id);

      await markTitleRushWinnerAwarded(weekStart, winner.user_id, {
        premium_until: nextUntil.toISOString(),
        awarded_at: winner.awarded_at || new Date().toISOString(),
      });

      if (!winner.awarded_at) {
        await createSocialNotification({
          userId: winner.user_id,
          actorName: `Juara ${winner.rank} - Premium ${winner.prize_days} Hari`,
          type: "premium_reward",
          slug: weekStart,
          targetId: String(winner.rank),
        });
      }

      awarded.push({
        ...winner,
        premium_until: nextUntil.toISOString(),
        awarded_at: winner.awarded_at || new Date().toISOString(),
      });
    }

    return NextResponse.json({
      saved: true,
      week_start: weekStart,
      weeks: await getEventWeeks(),
      current_week: currentWeek,
      awarded,
      message: awarded.length
        ? `${debug ? "[DEBUG] " : ""}Hadiah Title Rush minggu ${weekStart} berhasil diberikan.`
        : `Belum ada pemenang untuk minggu ${weekStart}.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = await request.json().catch(() => ({}));
    const weekStart = isValidWeekStart(body?.week_start)
      ? body.week_start
      : getCurrentWeekStart();
    const deleted = await deleteTitleRushWeek(weekStart);
    const count = deleted.scores;
    const winnersCount = deleted.winners;

    return NextResponse.json({
      deleted: count || 0,
      deleted_winners: winnersCount || 0,
      week_start: weekStart,
      weeks: await getEventWeeks(),
      current_week: getCurrentWeekStart(),
      message: `Data minggu ${weekStart} dihapus (${count || 0} skor, ${winnersCount || 0} winner).`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
