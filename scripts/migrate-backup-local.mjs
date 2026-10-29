#!/usr/bin/env node
/** Pindahkan `user_backup` dari Supabase ke Postgres lokal (sekali jalan). */
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
const PAGE = 200;

const db = new pg.Client({ connectionString: env.SOCIAL_DATABASE_URL });
await db.connect();

let total = 0;
for (let offset = 0; ; offset += PAGE) {
  const res = await fetch(
    `${SB}/rest/v1/user_backup?select=user_id,history,bookmarks&order=id.asc&limit=${PAGE}&offset=${offset}`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } },
  );
  if (!res.ok) throw new Error(`user_backup: HTTP ${res.status}`);
  const rows = await res.json();
  if (!rows.length) break;

  if (!dryRun) {
    await db.query(
      `insert into user_backup (user_id, history, bookmarks, updated_at)
       select u, h, b, now() from unnest($1::uuid[], $2::jsonb[], $3::jsonb[]) as t(u, h, b)
       on conflict (user_id) do nothing`,
      [
        rows.map((r) => r.user_id),
        rows.map((r) => JSON.stringify(r.history ?? [])),
        rows.map((r) => JSON.stringify(r.bookmarks ?? [])),
      ],
    );
  }
  total += rows.length;
  if (rows.length < PAGE) break;
}

const { rows: counts } = await db.query("select count(*)::int c from user_backup");
await db.end();
console.log(`${dryRun ? "[dry-run] " : ""}dibaca ${total} backup | lokal: ${counts[0].c}`);
