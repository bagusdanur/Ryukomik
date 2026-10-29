#!/usr/bin/env node
/**
 * Pindahkan `push_subscriptions` dan `notified_chapters` dari Supabase ke
 * Postgres lokal (sekali jalan, idempoten).
 *
 * Pemakaian: node scripts/migrate-push-local.mjs [--dry-run]
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

async function page(table, select, offset) {
  const res = await fetch(`${SB}/rest/v1/${table}?select=${select}&order=id.asc&limit=${PAGE}&offset=${offset}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
  return res.json();
}

const db = new pg.Client({ connectionString: env.SOCIAL_DATABASE_URL });
await db.connect();

let subs = 0;
for (let offset = 0; ; offset += PAGE) {
  const rows = await page("push_subscriptions", "user_id,endpoint,p256dh,auth", offset);
  if (!rows.length) break;
  if (!dryRun) {
    await db.query(
      `insert into push_subscriptions (user_id, endpoint, p256dh, auth)
       select * from unnest($1::uuid[], $2::text[], $3::text[], $4::text[])
       on conflict (endpoint) do nothing`,
      [
        rows.map((r) => r.user_id),
        rows.map((r) => r.endpoint),
        rows.map((r) => r.p256dh || ""),
        rows.map((r) => r.auth || ""),
      ],
    );
  }
  subs += rows.length;
  if (rows.length < PAGE) break;
}

let notified = 0;
for (let offset = 0; ; offset += PAGE) {
  const rows = await page("notified_chapters", "comic_slug,chapter,source", offset);
  if (!rows.length) break;
  if (!dryRun) {
    await db.query(
      `insert into notified_chapters (comic_slug, chapter, source)
       select * from unnest($1::text[], $2::text[], $3::text[])
       on conflict (comic_slug, chapter) do nothing`,
      [
        rows.map((r) => r.comic_slug),
        rows.map((r) => r.chapter),
        rows.map((r) => r.source ?? null),
      ],
    );
  }
  notified += rows.length;
  if (rows.length < PAGE) break;
}

const counts = await db.query(
  "select (select count(*) from push_subscriptions)::int as subs, (select count(*) from notified_chapters)::int as notified",
);
await db.end();
console.log(
  `${dryRun ? "[dry-run] " : ""}dibaca: ${subs} subscription, ${notified} penanda | lokal sekarang: ${counts.rows[0].subs} / ${counts.rows[0].notified}`,
);
