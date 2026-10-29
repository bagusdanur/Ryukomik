#!/usr/bin/env node
/** Pindahkan activity_events (audit admin) dari Supabase ke lokal. */
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

const res = await fetch(
  `${SB}/rest/v1/activity_events?select=id,actor_id,actor_name,event_type,entity_id,entity_label,visibility,created_at&order=id.asc`,
  { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } },
);
if (!res.ok) throw new Error(`activity_events: HTTP ${res.status}`);
const rows = await res.json();

const db = new pg.Client({ connectionString: env.SOCIAL_DATABASE_URL });
await db.connect();

if (!dryRun && rows.length) {
  await db.query(
    `insert into activity_events (id, actor_id, actor_name, event_type, entity_id, entity_label, visibility, created_at)
     select * from unnest($1::bigint[], $2::uuid[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::timestamptz[])
     on conflict (id) do nothing`,
    [
      rows.map((r) => r.id),
      rows.map((r) => r.actor_id),
      rows.map((r) => r.actor_name),
      rows.map((r) => r.event_type),
      rows.map((r) => r.entity_id ?? null),
      rows.map((r) => r.entity_label ?? null),
      rows.map((r) => r.visibility || "private"),
      rows.map((r) => r.created_at),
    ],
  );
  await db.query("select setval('activity_events_id_seq', (select coalesce(max(id),1) from activity_events))");
}

const { rows: counts } = await db.query("select count(*)::int c from activity_events");
await db.end();
console.log(`${dryRun ? "[dry-run] " : ""}dibaca ${rows.length} | lokal: ${counts[0].c}`);
