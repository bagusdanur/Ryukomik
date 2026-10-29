#!/usr/bin/env node
/** Pindahkan user_collections + user_collection_items dari Supabase ke lokal. */
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
const PAGE = 500;

async function page(table, select, offset) {
  const res = await fetch(`${SB}/rest/v1/${table}?select=${select}&order=id.asc&limit=${PAGE}&offset=${offset}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
  return res.json();
}

const db = new pg.Client({ connectionString: env.SOCIAL_DATABASE_URL });
await db.connect();

let collections = 0;
for (let offset = 0; ; offset += PAGE) {
  const rows = await page("user_collections", "id,user_id,name,is_public,description,visibility,cover_url,items_count,created_at,updated_at", offset);
  if (!rows.length) break;
  if (!dryRun) {
    await db.query(
      `insert into user_collections (id, user_id, name, is_public, description, visibility, cover_url, items_count, created_at, updated_at)
       select * from unnest($1::uuid[], $2::uuid[], $3::text[], $4::boolean[], $5::text[], $6::text[], $7::text[], $8::int[], $9::timestamptz[], $10::timestamptz[])
       on conflict (id) do nothing`,
      [
        rows.map((r) => r.id),
        rows.map((r) => r.user_id),
        rows.map((r) => r.name),
        rows.map((r) => r.is_public !== false),
        rows.map((r) => r.description ?? null),
        rows.map((r) => r.visibility ?? null),
        rows.map((r) => r.cover_url ?? null),
        rows.map((r) => Number(r.items_count) || 0),
        rows.map((r) => r.created_at),
        rows.map((r) => r.updated_at),
      ],
    );
  }
  collections += rows.length;
  if (rows.length < PAGE) break;
}

let items = 0;
for (let offset = 0; ; offset += PAGE) {
  const rows = await page("user_collection_items", "id,collection_id,user_id,source,slug,title,image,position,created_at", offset);
  if (!rows.length) break;
  if (!dryRun) {
    await db.query(
      `insert into user_collection_items (id, collection_id, user_id, source, slug, title, image, position, created_at)
       select * from unnest($1::uuid[], $2::uuid[], $3::uuid[], $4::text[], $5::text[], $6::text[], $7::text[], $8::int[], $9::timestamptz[])
       on conflict (id) do nothing`,
      [
        rows.map((r) => r.id),
        rows.map((r) => r.collection_id),
        rows.map((r) => r.user_id),
        rows.map((r) => r.source ?? null),
        rows.map((r) => r.slug),
        rows.map((r) => r.title ?? null),
        rows.map((r) => r.image ?? null),
        rows.map((r) => Number(r.position) || 0),
        rows.map((r) => r.created_at),
      ],
    );
  }
  items += rows.length;
  if (rows.length < PAGE) break;
}

const { rows: counts } = await db.query(
  "select (select count(*) from user_collections)::int c, (select count(*) from user_collection_items)::int i",
);
await db.end();
console.log(`${dryRun ? "[dry-run] " : ""}dibaca ${collections} koleksi / ${items} item | lokal: ${counts[0].c} / ${counts[0].i}`);
