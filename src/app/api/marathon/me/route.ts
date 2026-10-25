import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/social/auth";
import { getActiveEvent, getUserStanding } from "@/lib/marathon/repository";
import { weekKey, monthKey } from "@/lib/marathon/period";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId(request);
  } catch {
    return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });
  }

  try {
    const now = new Date();
    const event = await getActiveEvent(now);
    if (!event) {
      return NextResponse.json({ event: null, weekly: null, monthly: null });
    }

    const [weekly, monthly] = await Promise.all([
      getUserStanding(userId, "weekly", now),
      getUserStanding(userId, "monthly", now),
    ]);

    const res = NextResponse.json({
      event: { title: event.title, endsAt: event.ends_at },
      weekly: { periodKey: weekKey(now), ...weekly },
      monthly: { periodKey: monthKey(now), ...monthly },
    });
    res.headers.set("Cache-Control", "private, max-age=30");
    return res;
  } catch (error) {
    console.error("[marathon] me failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Gagal memuat posisi." }, { status: 500 });
  }
}
