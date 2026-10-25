import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/marathon/repository";

export const dynamic = "force-dynamic";

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
