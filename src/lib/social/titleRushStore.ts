import "server-only";

import { socialQuery } from "@/lib/social/db";

/** Profil ringkas yang dulu datang dari relasi Supabase `profiles(...)`. */
const PROFILE_JSON = `json_build_object(
  'username', p.username,
  'avatar_url', p.avatar_url,
  'premium_until', p.premium_until,
  'is_premium', p.is_premium
) as profiles`;

export type TitleRushScoreRow = {
  id: string;
  user_id: string;
  week_start: string;
  score: number;
  total_rounds: number;
  best_streak: number;
  updated_at: string;
  profiles?: Record<string, unknown> | null;
};

export type TitleRushWinnerRow = {
  id: string;
  user_id: string;
  week_start: string;
  rank: number;
  score: number;
  total_rounds: number;
  best_streak: number;
  prize_days: number | null;
  premium_until: string | null;
  awarded_at: string | null;
  created_at: string;
  profiles?: Record<string, unknown> | null;
};

/** Minggu yang punya skor / juara (untuk dropdown admin). */
export async function listTitleRushWeeks(limit = 100): Promise<{ scoreWeeks: string[]; winnerWeeks: string[] }> {
  const [scores, winners] = await Promise.all([
    socialQuery<{ week_start: string }>(
      "select distinct week_start::text as week_start from title_rush_scores order by week_start desc limit $1",
      [limit],
    ),
    socialQuery<{ week_start: string }>(
      "select distinct week_start::text as week_start from title_rush_winners order by week_start desc limit $1",
      [limit],
    ),
  ]);
  return { scoreWeeks: scores.rows.map((r) => r.week_start), winnerWeeks: winners.rows.map((r) => r.week_start) };
}

/** Juara yang sudah dikunci untuk satu minggu. */
export async function getLockedTitleRushWinners(weekStart: string): Promise<TitleRushWinnerRow[]> {
  const { rows } = await socialQuery<TitleRushWinnerRow>(
    `select w.id::text as id, w.user_id, w.week_start::text as week_start, w.rank, w.score,
            w.total_rounds, w.best_streak, w.prize_days, w.premium_until, w.awarded_at, w.created_at,
            ${PROFILE_JSON}
       from title_rush_winners w
       left join social_profiles p on p.user_id = w.user_id
      where w.week_start = $1::date
      order by w.rank asc`,
    [weekStart],
  );
  return rows;
}

/** Top 3 skor minggu berjalan (belum dikunci). */
export async function getTitleRushTopScores(weekStart: string, limit = 3): Promise<TitleRushScoreRow[]> {
  const { rows } = await socialQuery<TitleRushScoreRow>(
    `select s.id::text as id, s.user_id, s.week_start::text as week_start, s.score, s.total_rounds,
            s.best_streak, s.updated_at, ${PROFILE_JSON}
       from title_rush_scores s
       left join social_profiles p on p.user_id = s.user_id
      where s.week_start = $1::date
      order by s.score desc, s.best_streak desc, s.updated_at asc
      limit $2`,
    [weekStart, limit],
  );
  return rows;
}

/** Kunci juara (insert batch, idempoten). */
export async function insertTitleRushWinners(
  rows: Array<{ week_start: string; user_id: string; rank: number; score: number; total_rounds: number; best_streak: number; prize_days: number | null }>,
) {
  if (!rows.length) return;
  await socialQuery(
    `insert into title_rush_winners (week_start, user_id, rank, score, total_rounds, best_streak, prize_days)
     select * from unnest($1::date[], $2::uuid[], $3::int[], $4::int[], $5::int[], $6::int[], $7::int[])
     on conflict (week_start, user_id) do nothing`,
    [
      rows.map((r) => r.week_start),
      rows.map((r) => r.user_id),
      rows.map((r) => r.rank),
      rows.map((r) => r.score),
      rows.map((r) => r.total_rounds),
      rows.map((r) => r.best_streak),
      rows.map((r) => r.prize_days),
    ],
  );
}

/** Tandai premium juara sudah diberikan. */
export async function markTitleRushWinnerAwarded(weekStart: string, userId: string, patch: { premium_until: string; awarded_at: string }) {
  await socialQuery(
    `update title_rush_winners
        set premium_until = $3::timestamptz, awarded_at = $4::timestamptz
      where week_start = $1::date and user_id = $2`,
    [weekStart, userId, patch.premium_until, patch.awarded_at],
  );
}

/** Hapus semua skor + juara satu minggu (admin reset). */
export async function deleteTitleRushWeek(weekStart: string): Promise<{ scores: number; winners: number }> {
  const scores = await socialQuery("delete from title_rush_scores where week_start = $1::date", [weekStart]);
  const winners = await socialQuery("delete from title_rush_winners where week_start = $1::date", [weekStart]);
  return { scores: scores.rowCount ?? 0, winners: winners.rowCount ?? 0 };
}

/** Skor satu user pada satu minggu (dipakai submit game). */
export async function getTitleRushScore(userId: string, weekStart: string) {
  const { rows } = await socialQuery<{ id: string; score: number; total_rounds: number; best_streak: number; updated_at: string }>(
    `select id::text as id, score, total_rounds, best_streak, updated_at
       from title_rush_scores where user_id = $1 and week_start = $2::date`,
    [userId, weekStart],
  );
  return rows[0] ?? null;
}

/** Tambah skor user (upsert atomik). */
export async function addTitleRushScore(input: {
  userId: string;
  weekStart: string;
  score: number;
  totalRounds: number;
  bestStreak: number;
  sourcePage: string | number | null;
}) {
  const { rows } = await socialQuery<{ score: number; total_rounds: number; best_streak: number }>(
    `insert into title_rush_scores (user_id, week_start, score, total_rounds, best_streak, source_page)
     values ($1, $2::date, $3, $4, $5, $6)
     on conflict (user_id, week_start) do update
       set score = title_rush_scores.score + excluded.score,
           total_rounds = title_rush_scores.total_rounds + excluded.total_rounds,
           best_streak = greatest(title_rush_scores.best_streak, excluded.best_streak),
           source_page = excluded.source_page,
           updated_at = now()
     returning score, total_rounds, best_streak`,
    [input.userId, input.weekStart, input.score, input.totalRounds, input.bestStreak, input.sourcePage === null ? null : String(input.sourcePage)],
  );
  return rows[0];
}

/** Papan peringkat minggu berjalan + profil (role ikut untuk badge). */
export async function getTitleRushLeaderboard(weekStart: string, limit = 10) {
  const { rows } = await socialQuery(
    `select s.id::text as id, s.user_id, s.score, s.total_rounds, s.best_streak,
            s.week_start::text as week_start, s.updated_at,
            json_build_object('username', p.username, 'avatar_url', p.avatar_url,
                              'role', p.role, 'is_premium', p.is_premium) as profiles
       from title_rush_scores s
       left join social_profiles p on p.user_id = s.user_id
      where s.week_start = $1::date
      order by s.score desc, s.best_streak desc, s.updated_at asc
      limit $2`,
    [weekStart, limit],
  );
  return rows;
}

/** Juara aktif (sudah diberi hadiah) lengkap dengan profil. */
export async function getAwardedTitleRushWinnersDetailed(sinceIso: string, limit = 3) {
  const { rows } = await socialQuery(
    `select w.id::text as id, w.user_id, w.rank, w.score, w.total_rounds, w.best_streak,
            w.week_start::text as week_start, w.awarded_at,
            json_build_object('username', p.username, 'avatar_url', p.avatar_url,
                              'role', p.role, 'is_premium', p.is_premium) as profiles
       from title_rush_winners w
       left join social_profiles p on p.user_id = w.user_id
      where w.awarded_at is not null and w.awarded_at >= $1::timestamptz
      order by w.rank asc
      limit $2`,
    [sinceIso, limit],
  );
  return rows;
}

/** Riwayat juara sebelum minggu berjalan. */
export async function getTitleRushWinnerHistory(beforeWeek: string, limit = 80) {
  const { rows } = await socialQuery(
    `select w.id::text as id, w.user_id, w.rank, w.score, w.total_rounds, w.best_streak,
            w.week_start::text as week_start, w.awarded_at,
            json_build_object('username', p.username, 'avatar_url', p.avatar_url,
                              'role', p.role, 'is_premium', p.is_premium) as profiles
       from title_rush_winners w
       left join social_profiles p on p.user_id = w.user_id
      where w.week_start < $1::date
      order by w.week_start desc, w.rank asc
      limit $2`,
    [beforeWeek, limit],
  );
  return rows;
}

/** Juara yang sudah diberi hadiah sejak `since` (badge di leaderboard/komentar). */
export async function listAwardedTitleRushWinners(sinceIso: string, userIds?: string[], limit?: number) {
  const params: unknown[] = [sinceIso];
  let filter = "";
  if (userIds?.length) {
    params.push(userIds);
    filter = ` and user_id = any($${params.length}::uuid[])`;
  }
  params.push(limit ?? 100);
  const { rows } = await socialQuery<{ user_id: string; rank: number }>(
    `select user_id, rank from title_rush_winners
      where awarded_at is not null and awarded_at >= $1::timestamptz${filter}
      order by rank asc
      limit $${params.length}`,
    params,
  );
  return rows;
}
