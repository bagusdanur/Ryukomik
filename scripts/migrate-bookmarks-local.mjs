#!/usr/bin/env node
/**
 * Pindahkan `bookmark_sync` dari Supabase ke Postgres lokal (sekali jalan,
 * idempoten lewat unique (user_id, comic_slug)).
 *
 * Pemakaian: node scripts/migrate-bookmarks-local.mjs [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, ".env.local"), "utf8")
    .split("\n")
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, "")]),
);

const dryRun = process.argv.includes("--dry-run");
const SB = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const PAGE = 1000;

const db = new pg.Client({ connectionString: env.SOCIAL_DATABASE_URL });
await db.connect();

let total = 0;
for (let offset = 0; ; offset += PAGE) {
  const res = await fetch(
    `${SB}/rest/v1/bookmark_sync?select=user_id,comic_slug,source,title,image&order=id.asc&limit=${PAGE}&offset=${offset}`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } },
  );
  if (!res.ok) throw new Error(`bookmark_sync: HTTP ${res.status}`);
  const rows = await res.json();
  if (!rows.length) break;

  if (!dryRun && rows.length) {
    await db.query(
      `insert into bookmark_sync (user_id, comic_slug, source, title, image)
       select * from unnest($1::uuid[], $2::text[], $3::text[], $4::text[], $5::text[])
       on conflict (user_id, comic_slug) do nothing`,
      [
        rows.map((r) => r.user_id),
        rows.map((r) => r.comic_slug),
        rows.map((r) => r.source ?? null),
        rows.map((r) => r.title ?? null),
        rows.map((r) => r.image ?? null),
      ],
    );
  }
  total += rows.length;
  if (rows.length < PAGE) break;
}

const { rows: counts } = await db.query("select count(*)::int as c, count(distinct user_id)::int as users from bookmark_sync");
await db.end();
console.log(`${dryRun ? "[dry-run] " : ""}dibaca ${total} baris | lokal: ${counts[0].c} baris / ${counts[0].users} user`);
