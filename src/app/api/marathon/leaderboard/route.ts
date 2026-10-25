import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/marathon/repository";

export const dynamic = "force-dynamic";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Hadiah untuk periode yang dipilih; fallback ke kolom lama bila array kosong. */
function prizeDaysFor(
  period: "weekly" | "monthly",
  event: {
    weekly_days: number[] | null;
    monthly_days: number[] | null;
    premium_days_1: number;
    premium_days_2: number;
    premium_days_3: number;
  },
) {
  const configured = period === "monthly" ? event.monthly_days : event.weekly_days;
  const fallback = [event.premium_days_1, event.premium_days_2, event.premium_days_3];
  const days = Array.isArray(configured) && configured.length ? configured : fallback;
  return days.slice(0, 3).map((value, index) => ({
    rank: index + 1,
    medal: MEDALS[index],
    days: Number(value) || 0,
    label: `Premium ${Number(value) || 0} hari + Badge Juara ${index + 1}`,
  }));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = url.searchParams.get("period") === "monthly" ? "monthly" : "weekly";

  try {
    const data = await getLeaderboard(period, 25);
    const res = NextResponse.json({
      period,
      periodKey: data.periodKey,
      event: data.event
        ? {
            title: data.event.title,
            description: data.event.description,
            startsAt: data.event.starts_at,
            endsAt: data.event.ends_at,
            prize1: data.event.prize_1,
            prize2: data.event.prize_2,
            prize3: data.event.prize_3,
            prizes: prizeDaysFor(period, data.event),
          }
        : null,
      rows: data.rows,
    });
    res.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    return res;
  } catch (error) {
    console.error("[marathon] leaderboard failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ period, periodKey: null, event: null, rows: [] }, { status: 200 });
  }
}
