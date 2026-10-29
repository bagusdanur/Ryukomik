#!/usr/bin/env node
/** Pindahkan title_rush_scores + title_rush_winners dari Supabase ke lokal. */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, "")]),
);
const dryRun = process.argv.includes("--dry-run");
const SB = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function get(table, select) {
  const res = await fetch(`${SB}/rest/v1/${table}?select=${select}&order=id.asc`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
  return res.json();
}

const scores = await get("title_rush_scores", "user_id,week_start,score,total_rounds,best_streak,source_page,created_at,updated_at");
const winners = await get("title_rush_winners", "week_start,user_id,rank,score,total_rounds,best_streak,prize_days,premium_until,awarded_at,created_at");

const db = new pg.Client({ connectionString: env.SOCIAL_DATABASE_URL });
await db.connect();

if (!dryRun) {
  if (scores.length) {
    await db.query(
      `insert into title_rush_scores (user_id, week_start, score, total_rounds, best_streak, source_page, created_at, updated_at)
       select * from unnest($1::uuid[], $2::date[], $3::int[], $4::int[], $5::int[], $6::text[], $7::timestamptz[], $8::timestamptz[])
       on conflict (user_id, week_start) do nothing`,
      [
        scores.map((r) => r.user_id),
        scores.map((r) => r.week_start),
        scores.map((r) => Number(r.score) || 0),
        scores.map((r) => Number(r.total_rounds) || 0),
        scores.map((r) => Number(r.best_streak) || 0),
        scores.map((r) => r.source_page ?? null),
        scores.map((r) => r.created_at),
        scores.map((r) => r.updated_at),
      ],
    );
  }
  if (winners.length) {
    await db.query(
      `insert into title_rush_winners (week_start, user_id, rank, score, total_rounds, best_streak, prize_days, premium_until, awarded_at, created_at)
       select * from unnest($1::date[], $2::uuid[], $3::int[], $4::int[], $5::int[], $6::int[], $7::int[], $8::timestamptz[], $9::timestamptz[], $10::timestamptz[])
       on conflict (week_start, user_id) do nothing`,
      [
        winners.map((r) => r.week_start),
        winners.map((r) => r.user_id),
        winners.map((r) => Number(r.rank) || 0),
        winners.map((r) => Number(r.score) || 0),
        winners.map((r) => Number(r.total_rounds) || 0),
        winners.map((r) => Number(r.best_streak) || 0),
        winners.map((r) => r.prize_days ?? null),
        winners.map((r) => r.premium_until ?? null),
        winners.map((r) => r.awarded_at ?? null),
        winners.map((r) => r.created_at),
      ],
    );
  }
}

const { rows: counts } = await db.query(
  "select (select count(*) from title_rush_scores)::int s, (select count(*) from title_rush_winners)::int w",
);
await db.end();
console.log(`${dryRun ? "[dry-run] " : ""}dibaca ${scores.length} skor / ${winners.length} juara | lokal: ${counts[0].s} / ${counts[0].w}`);
