#!/usr/bin/env node
/** Pindahkan app_settings dari Supabase ke Postgres lokal (sekali jalan). */
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

const res = await fetch(`${SB}/rest/v1/app_settings?select=key,value,updated_at`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
});
if (!res.ok) throw new Error(`app_settings: HTTP ${res.status}`);
const rows = await res.json();

const db = new pg.Client({ connectionString: env.SOCIAL_DATABASE_URL });
await db.connect();

if (!dryRun && rows.length) {
  await db.query(
    `insert into app_settings (key, value, updated_at)
     select * from unnest($1::text[], $2::jsonb[], $3::timestamptz[])
     on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at`,
    [rows.map((r) => r.key), rows.map((r) => JSON.stringify(r.value ?? {})), rows.map((r) => r.updated_at)],
  );
}

const { rows: local } = await db.query("select key, updated_at from app_settings order by key");
await db.end();
console.log(`${dryRun ? "[dry-run] " : ""}dibaca ${rows.length} setting | lokal: ${local.length}`);
for (const row of local) console.log(" -", row.key, row.updated_at.toISOString());
