#!/usr/bin/env node
/**
 * Finalisasi pemenang Marathon Baca untuk periode yang sudah selesai.
 *
 * Dijalankan cron harian (00:10 WIB). Idempoten: unique (event, period, rank)
 * membuat eksekusi berulang tidak menghasilkan duplikat.
 *
 *   node --env-file=.env.local scripts/marathon-finalize.mjs
 */
import pg from "pg";

const TZ = "Asia/Jakarta";

/** Bagian tanggal kalender WIB. */
function jakartaParts(date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day) };
}

function weekKey(date) {
  const { y, m, d } = jakartaParts(date);
  const t = new Date(Date.UTC(y, m - 1, d));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function previousWeekKey(date = new Date()) {
  return weekKey(new Date(date.getTime() - 7 * 86_400_000));
}

function previousMonthKey(date = new Date()) {
  const { y, m } = jakartaParts(date);
  const lastMonthDay = new Date(Date.UTC(y, m - 1, 1) - 86_400_000);
  return `${lastMonthDay.getUTCFullYear()}-${String(lastMonthDay.getUTCMonth() + 1).padStart(2, "0")}`;
}

const connectionString = process.env.SOCIAL_DATABASE_URL;
if (!connectionString) {
  console.error("[marathon-finalize] SOCIAL_DATABASE_URL tidak di-set");
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({ connectionString, application_name: "marathon-finalize" });

async function finalize(periodType, periodKey) {
  const { rows: events } = await pool.query(
    `select id, slug, weekly_days, monthly_days,
            premium_days_1, premium_days_2, premium_days_3
       from marathon_events where is_active`,
  );

  let total = 0;
  let notified = 0;

  for (const event of events) {
    const configured = periodType === "monthly" ? event.monthly_days : event.weekly_days;
    const fallback = [event.premium_days_1, event.premium_days_2, event.premium_days_3];
    const days = (Array.isArray(configured) && configured.length ? configured : fallback)
      .slice(0, 3)
      .map((value) => Number(value) || 0);

    const { rows } = await pool.query(
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
              'Premium ' || case rnk when 1 then $4::int when 2 then $5::int else $6::int end
                || ' hari + Badge Juara ' || rnk || ' '
                || case when $2 = 'monthly' then 'Bulanan' else 'Mingguan' end,
              case rnk when 1 then $4::int when 2 then $5::int else $6::int end
         from ranked
        where rnk <= 3
       on conflict (event_id, period_type, period_key, rank) do nothing
       returning id, rank, user_id, username, chapters, premium_days`,
      [event.id, periodType, periodKey, days[0] ?? 0, days[1] ?? 0, days[2] ?? 0],
    );

    total += rows.length;

    for (const row of rows) {
      console.log(
        `[marathon-finalize] +${row.rank} ${row.username} (${row.chapters} ch) ${periodType} ${periodKey}`,
      );

      // Kabari pemenang: tampil di panel notifikasi dan mengarah ke /marathon.
      try {
        await pool.query(
          `insert into social_notifications (user_id, actor_name, type, slug, chapter, target_id)
           values ($1, 'Speedrun', 'marathon_win', $2, $3, $4)`,
          [row.user_id, periodType, String(row.rank), periodKey],
        );
        notified += 1;
      } catch (error) {
        console.error("[marathon-finalize] gagal kirim notifikasi:", error.message);
      }
    }
  }

  console.log(
    `[marathon-finalize] ${periodType} ${periodKey}: ${total} winner baru, ${notified} notifikasi`,
  );
  return total;
}

async function main() {
  const now = new Date();
  const week = previousWeekKey(now);
  const month = previousMonthKey(now);
  const a = await finalize("weekly", week);
  const b = await finalize("monthly", month);
  console.log(`[marathon-finalize] selesai: ${a + b} winner baru`);
}

main()
  .catch((error) => {
    console.error("[marathon-finalize] gagal:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
