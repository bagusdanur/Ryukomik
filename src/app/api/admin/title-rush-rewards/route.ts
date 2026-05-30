import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

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

async function verifyAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Login diperlukan.", status: 401 } as const;

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    return { error: "Sesi login tidak valid.", status: 401 } as const;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return { error: "Akses admin diperlukan.", status: 403 } as const;
  }

  return { userId: authData.user.id } as const;
}

async function getEventWeeks() {
  const [scoresResult, winnersResult] = await Promise.all([
    supabaseAdmin
      .from("title_rush_scores")
      .select("week_start")
      .order("week_start", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("title_rush_winners")
      .select("week_start")
      .order("week_start", { ascending: false })
      .limit(100),
  ]);

  if (scoresResult.error) throw scoresResult.error;
  if (winnersResult.error) throw winnersResult.error;

  const weeks = Array.from(
    new Set(
      [...(scoresResult.data || []), ...(winnersResult.data || [])]
        .map((row) => row.week_start)
        .filter(Boolean),
    ),
  );
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
  const { data, error } = await supabaseAdmin
    .from("title_rush_winners")
    .select(
      "id, user_id, rank, score, total_rounds, best_streak, prize_days, premium_until, awarded_at, week_start, created_at, profiles(username, avatar_url, premium_until, is_premium)",
    )
    .eq("week_start", weekStart)
    .order("rank", { ascending: true });

  if (error) throw error;

  return ((data || []) as unknown as WinnerRow[]).map((row, index) =>
    mapWinner({ ...row, updated_at: row.awarded_at || row.week_start }, index),
  );
}

async function getWinners(weekStart = getCurrentWeekStart()) {
  const locked = await getLockedWinners(weekStart);
  if (locked.length > 0) {
    return { weekStart, winners: locked };
  }

  const { data, error } = await supabaseAdmin
    .from("title_rush_scores")
    .select(
      "user_id, score, total_rounds, best_streak, week_start, updated_at, profiles(username, avatar_url, premium_until, is_premium)",
    )
    .eq("week_start", weekStart)
    .order("score", { ascending: false })
    .order("best_streak", { ascending: false })
    .order("updated_at", { ascending: true })
    .limit(3);

  if (error) throw error;

  return {
    weekStart,
    winners: ((data || []) as WinnerRow[]).map((row, index) => mapWinner(row, index)),
  };
}

async function lockWinners(weekStart: string) {
  const locked = await getLockedWinners(weekStart);
  if (locked.length > 0) return locked;

  const { winners } = await getWinners(weekStart);
  if (winners.length === 0) return [];

  const { error } = await supabaseAdmin.from("title_rush_winners").insert(
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

  if (error) throw error;
  return getLockedWinners(weekStart);
}

export async function GET(request: Request) {
  try {
    const admin = await verifyAdmin(request);
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
    const admin = await verifyAdmin(request);
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

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          is_premium: true,
          premium_until: nextUntil.toISOString(),
        })
        .eq("id", winner.user_id);

      if (error) throw error;

      await supabaseAdmin
        .from("title_rush_winners")
        .update({
          premium_until: nextUntil.toISOString(),
          awarded_at: winner.awarded_at || new Date().toISOString(),
        })
        .eq("week_start", weekStart)
        .eq("user_id", winner.user_id);

      if (!winner.awarded_at) {
        await supabaseAdmin.from("notifications").insert({
          user_id: winner.user_id,
          actor_id: winner.user_id,
          actor_name: `Juara ${winner.rank} - Premium ${winner.prize_days} Hari`,
          type: "premium_reward",
          slug: weekStart,
          target_id: String(winner.rank),
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
    const admin = await verifyAdmin(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = await request.json().catch(() => ({}));
    const weekStart = isValidWeekStart(body?.week_start)
      ? body.week_start
      : getCurrentWeekStart();
    const { error, count } = await supabaseAdmin
      .from("title_rush_scores")
      .delete({ count: "exact" })
      .eq("week_start", weekStart);

    if (error) throw error;

    const { error: winnersError, count: winnersCount } = await supabaseAdmin
      .from("title_rush_winners")
      .delete({ count: "exact" })
      .eq("week_start", weekStart);

    if (winnersError) throw winnersError;

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
