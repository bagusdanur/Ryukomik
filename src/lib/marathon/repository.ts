import "server-only";

import { socialQuery, socialTransaction } from "@/lib/social/db";
import {
  capRemaining,
  isEventActive,
  monthKey,
  previousMonthKey,
  previousWeekKey,
  weekKey,
  type MarathonEventWindow,
} from "./period";

export type MarathonPeriod = "weekly" | "monthly";

export type MarathonEvent = MarathonEventWindow & {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  prize_1: string | null;
  prize_2: string | null;
  prize_3: string | null;
  premium_days_1: number;
  premium_days_2: number;
  premium_days_3: number;
  weekly_days: number[] | null;
  monthly_days: number[] | null;
  daily_chapter_cap: number;
};

export type LeaderboardRow = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  level: number | null;
  is_premium: boolean | null;
  role: string | null;
  total_reads: number | null;
  chapters: number;
  rank: number;
  updated_at: string;
  /** Peringkat juara pada periode mana pun (badge), null kalau belum pernah menang. */
  winner_rank: number | null;
  /** Periode kemenangan badge (mingguan vs bulanan dibedakan). */
  winner_period: "weekly" | "monthly" | null;
};

export type Standing = {
  chapters: number;
  rank: number | null;
  total_players: number;
  third_chapters: number | null;
};

const EVENT_CACHE_MS = 60_000;
let eventCache: { at: number; row: MarathonEvent | null } | null = null;

/** Event yang sedang berjalan (cache 60 detik di memori proses). */
export async function getActiveEvent(now: Date = new Date()): Promise<MarathonEvent | null> {
  if (eventCache && Date.now() - eventCache.at < EVENT_CACHE_MS) {
    return eventCache.row && isEventActive(eventCache.row, now) ? eventCache.row : null;
  }
  const { rows } = await socialQuery<MarathonEvent>(
    `select * from marathon_events
      where is_active
        and starts_at <= $1
        and (ends_at is null or ends_at >= $1)
      order by starts_at desc
      limit 1`,
    [now.toISOString()],
  );
  eventCache = { at: Date.now(), row: rows[0] ?? null };
  return rows[0] ?? null;
}

export function invalidateMarathonEventCache() {
  eventCache = null;
}

/**
 * Catat chapter yang baru dibaca user ke event lokal.
 * Idempoten: satu chapter dihitung sekali per periode.
 * Dipanggil dari /api/xp/read dan tidak boleh menggagalkan request tersebut.
 */
export async function recordMarathonReads(
  userId: string,
  slugs: string[],
  now: Date = new Date(),
): Promise<{ weekly: number; monthly: number }> {
  const empty = { weekly: 0, monthly: 0 };
  const event = await getActiveEvent(now);
  if (!event || !slugs.length) return empty;

  const periods: Array<{ type: MarathonPeriod; key: string }> = [
    { type: "weekly", key: weekKey(now) },
    { type: "monthly", key: monthKey(now) },
  ];

  return socialTransaction(async (client) => {
    // Satu chapter tercatat DUA baris (weekly + monthly), jadi hitung chapter
    // unik. Dengan count(*) cap 300 hanya memberi 150 chapter/hari.
    const { rows: capRows } = await client.query<{ c: number }>(
      `select count(distinct chapter_slug)::int as c
         from marathon_reads
        where user_id = $1
          and read_at >= (date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta')`,
      [userId],
    );
    const remaining = capRemaining(capRows[0]?.c ?? 0, event.daily_chapter_cap);
    if (remaining <= 0) return empty;

    const limited = slugs.slice(0, remaining);
    const result = { ...empty };

    for (const period of periods) {
      const { rows } = await client.query<{ inserted: number }>(
        `insert into marathon_reads (event_id, user_id, chapter_slug, period_type, period_key)
         select $1, $2, s, $3, $4 from unnest($5::text[]) as s
         on conflict (event_id, user_id, chapter_slug, period_type, period_key) do nothing
         returning 1 as inserted`,
        [event.id, userId, period.type, period.key, limited],
      );
      const inserted = rows.length;
      result[period.type] = inserted;

      if (inserted > 0) {
        await client.query(
          `insert into marathon_scores (event_id, user_id, period_type, period_key, chapters)
           values ($1, $2, $3, $4, $5)
           on conflict (event_id, user_id, period_type, period_key)
           do update set chapters = marathon_scores.chapters + excluded.chapters,
                         updated_at = now()`,
          [event.id, userId, period.type, period.key, inserted],
        );
      }
    }

    return result;
  });
}

export async function getLeaderboard(
  periodType: MarathonPeriod,
  limit = 25,
  now: Date = new Date(),
): Promise<{ event: MarathonEvent | null; periodKey: string | null; rows: LeaderboardRow[] }> {
  const event = await getActiveEvent(now);
  if (!event) return { event: null, periodKey: null, rows: [] };

  const period_key = periodType === "weekly" ? weekKey(now) : monthKey(now);
  const { rows } = await socialQuery<LeaderboardRow>(
    `select s.user_id,
            coalesce(p.username, 'user-' || left(s.user_id::text, 8)) as username,
            p.avatar_url, p.avatar_border, p.level, p.is_premium, p.role, p.total_reads,
            s.chapters,
            row_number() over (order by s.chapters desc, s.updated_at asc)::int as rank,
            s.updated_at,
            wb.rank as winner_rank,
            wb.period_type as winner_period
       from marathon_scores s
       left join social_profiles p on p.user_id = s.user_id
       left join lateral (
         select w.rank, w.period_type
           from marathon_winners w
          where w.event_id = s.event_id
            and w.user_id = s.user_id
            and w.status <> 'void'
          order by case w.period_type when 'monthly' then 0 else 1 end,
                   w.rank asc,
                   w.created_at desc
          limit 1
       ) wb on true
      where s.event_id = $1 and s.period_type = $2 and s.period_key = $3
      order by s.chapters desc, s.updated_at asc
      limit $4`,
    [event.id, periodType, period_key, limit],
  );

  return { event, periodKey: period_key, rows };
}

export async function getUserStanding(
  userId: string,
  periodType: MarathonPeriod,
  now: Date = new Date(),
): Promise<Standing | null> {
  const event = await getActiveEvent(now);
  if (!event) return null;

  const period_key = periodType === "weekly" ? weekKey(now) : monthKey(now);
  const { rows } = await socialQuery<Standing>(
    `with ranked as (
       select user_id, chapters,
              row_number() over (order by chapters desc, updated_at asc)::int as rank
         from marathon_scores
        where event_id = $1 and period_type = $2 and period_key = $3
     ), summary as (
       select count(*)::int as total_players,
              max(case when rank = 3 then chapters end) as third_chapters
         from ranked
     )
     select coalesce((select chapters from ranked where user_id = $4), 0)::int as chapters,
            (select rank from ranked where user_id = $4)::int as rank,
            summary.total_players,
            summary.third_chapters
       from summary`,
    [event.id, periodType, period_key, userId],
  );

  const row = rows[0];
  return {
    chapters: Number(row?.chapters ?? 0),
    rank: row?.rank ?? null,
    total_players: Number(row?.total_players ?? 0),
    third_chapters: row?.third_chapters ?? null,
  };
}

/** Bekukan top 3 satu periode ke marathon_winners (idempoten). */
export async function finalizePeriod(
  periodType: MarathonPeriod,
  periodKey: string,
): Promise<Array<{ rank: number; username: string; chapters: number }>> {
  const { rows: events } = await socialQuery<{ id: string }>(
    `select id from marathon_events where is_active`,
  );

  const created: Array<{ rank: number; username: string; chapters: number }> = [];

  for (const event of events) {
    const { rows } = await socialQuery<{ rank: number; username: string; chapters: number }>(
      `with ranked as (
         select s.event_id, s.period_type, s.period_key,
                row_number() over (order by s.chapters desc, s.updated_at asc)::int as rnk,
                s.user_id,
                coalesce(p.username, 'user-' || left(s.user_id::text, 8)) as username,
                s.chapters
           from marathon_scores s
           left join social_profiles p on p.user_id = s.user_id
          where s.event_id = $1 and s.period_type = $2 and s.period_key = $3
       )
       insert into marathon_winners
         (event_id, period_type, period_key, rank, user_id, username, chapters, prize_label, premium_days)
       select event_id, period_type, period_key, rnk, user_id, username, chapters,
              case rnk when 1 then (select prize_1 from marathon_events where id = $1)
                       when 2 then (select prize_2 from marathon_events where id = $1)
                       else (select prize_3 from marathon_events where id = $1) end,
              case rnk when 1 then (select premium_days_1 from marathon_events where id = $1)
                       when 2 then (select premium_days_2 from marathon_events where id = $1)
                       else (select premium_days_3 from marathon_events where id = $1) end
         from ranked
        where rnk <= 3
       on conflict (event_id, period_type, period_key, rank) do nothing
       returning rank, username, chapters`,
      [event.id, periodType, periodKey],
    );
    created.push(...rows);
  }

  return created;
}

/** Finalisasi periode yang sudah selesai (dipakai cron harian). */
export async function finalizeCompletedPeriods(now: Date = new Date()) {
  const week = await finalizePeriod("weekly", previousWeekKey(now));
  const month = await finalizePeriod("monthly", previousMonthKey(now));
  return {
    weekly: { periodKey: previousWeekKey(now), winners: week },
    monthly: { periodKey: previousMonthKey(now), winners: month },
  };
}

export async function listWinners(limit = 60) {
  const { rows } = await socialQuery(
    `select w.*, e.title as event_title
       from marathon_winners w
       join marathon_events e on e.id = w.event_id
      order by w.created_at desc, w.period_type, w.rank
      limit $1`,
    [limit],
  );
  return rows;
}

export async function setWinnerStatus(
  winnerId: string,
  status: "granted" | "void" | "pending",
  adminId?: string,
) {
  const { rows } = await socialQuery(
    `update marathon_winners
        set status = $2,
            granted_at = case when $2 = 'granted' then now() else null end,
            granted_by = case when $2 = 'granted' then $3::uuid else null end
      where id = $1
      returning *`,
    [winnerId, status, adminId ?? null],
  );
  return rows[0] ?? null;
}

export async function getWinner(winnerId: string) {
  const { rows } = await socialQuery(`select * from marathon_winners where id = $1`, [winnerId]);
  return rows[0] ?? null;
}

const EVENT_FIELDS = [
  "title",
  "description",
  "starts_at",
  "ends_at",
  "is_active",
  "prize_1",
  "prize_2",
  "prize_3",
  "premium_days_1",
  "premium_days_2",
  "premium_days_3",
  "daily_chapter_cap",
] as const;

export async function updateEvent(eventId: string, patch: Record<string, unknown>) {
  const sets: string[] = [];
  const values: unknown[] = [eventId];

  for (const field of EVENT_FIELDS) {
    if (!(field in patch)) continue;
    values.push(patch[field]);
    sets.push(`${field} = $${values.length}`);
  }
  if (!sets.length) return null;

  const { rows } = await socialQuery(
    `update marathon_events set ${sets.join(", ")}, updated_at = now()
      where id = $1 returning *`,
    values,
  );
  eventCache = null;
  return rows[0] ?? null;
}
