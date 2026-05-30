import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getTitleRushEventStatus } from "@/lib/titleRushEvent";

type ExistingScore = {
  id: string;
  score: number;
  total_rounds: number;
  best_streak: number;
  updated_at: string | null;
};

const SUBMIT_COOLDOWN_MS = 60 * 60 * 1000;

function getCurrentWeekStart() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const jakarta = new Date(utc + 7 * 60 * 60000);
  const day = jakarta.getDay() || 7;
  jakarta.setDate(jakarta.getDate() - day + 1);
  jakarta.setHours(0, 0, 0, 0);
  return jakarta.toISOString().slice(0, 10);
}

function toSafeInt(value: unknown, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

export async function POST(request: Request) {
  try {
    const eventStatus = await getTitleRushEventStatus();
    if (!eventStatus.enabled) {
      return NextResponse.json(
        { error: "Event Title Rush sedang ditutup sementara." },
        { status: 403 },
      );
    }

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Sesi login tidak valid." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const score = toSafeInt(body?.score, 0, 10);
    const totalRounds = toSafeInt(body?.total_rounds, 1, 10);
    const bestStreak = toSafeInt(body?.best_streak, 0, 10);
    const sourcePage = toSafeInt(body?.source_page, 1, 24);
    const weekStart = getCurrentWeekStart();
    const rawScore = Number(body?.score);
    const rawTotalRounds = Number(body?.total_rounds);
    const rawBestStreak = Number(body?.best_streak);

    if (
      !Number.isFinite(rawScore) ||
      !Number.isFinite(rawTotalRounds) ||
      !Number.isFinite(rawBestStreak) ||
      rawScore < 0 ||
      rawBestStreak < 0 ||
      rawTotalRounds < 1 ||
      rawTotalRounds > 10 ||
      rawScore > rawTotalRounds ||
      rawBestStreak > rawTotalRounds
    ) {
      return NextResponse.json(
        { error: "Data skor tidak valid." },
        { status: 400 },
      );
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("title_rush_scores")
      .select("id, score, total_rounds, best_streak, updated_at")
      .eq("user_id", authData.user.id)
      .eq("week_start", weekStart)
      .maybeSingle();

    if (existingError) throw existingError;

    const current = existing as ExistingScore | null;
    const lastUpdate = current?.updated_at ? new Date(current.updated_at).getTime() : 0;

    if (lastUpdate && Date.now() - lastUpdate < SUBMIT_COOLDOWN_MS) {
      const retryAfter = Math.ceil((SUBMIT_COOLDOWN_MS - (Date.now() - lastUpdate)) / 1000);
      const retryMinutes = Math.ceil(retryAfter / 60);

      return NextResponse.json(
        {
          error: `Tunggu ${retryMinutes} menit sebelum menyimpan poin lagi.`,
          retry_after: retryAfter,
        },
        { status: 429 },
      );
    }

    const payload = {
      user_id: authData.user.id,
      week_start: weekStart,
      score: (current?.score || 0) + score,
      total_rounds: (current?.total_rounds || 0) + totalRounds,
      best_streak: Math.max(current?.best_streak || 0, bestStreak),
      source_page: sourcePage,
      updated_at: new Date().toISOString(),
    };

    const query = current
      ? supabaseAdmin.from("title_rush_scores").update(payload).eq("id", current.id)
      : supabaseAdmin.from("title_rush_scores").insert(payload);

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({
      saved: true,
      week_start: weekStart,
      score: payload.score,
      total_rounds: payload.total_rounds,
      best_streak: payload.best_streak,
      message: "Poin mingguan berhasil ditambahkan.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
