import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

/**
 * Migrasi komentar Supabase -> Postgres lokal (ryukomik_social).
 * Idempoten: baris yang sudah ada dilewati (on conflict do nothing).
 *
 * Pakai: node --env-file=.env.local scripts/migrate-comments-local.mjs
 */

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^"|"$/g, "");
  }
  return out;
}

const env = { ...loadEnv(resolve(projectRoot, ".env.local")), ...process.env };
const dbUrl = env.SOCIAL_DATABASE_URL || env.DATABASE_URL;
const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const sbKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!dbUrl || !sbUrl || !sbKey) throw new Error("Env DB/Supabase belum lengkap.");

const db = new pg.Client({ connectionString: dbUrl });
await db.connect();

await db.query(`
  create table if not exists comments (
    id bigint primary key,
    type text not null,
    slug text not null,
    chapter text,
    content text not null,
    author_name text,
    user_id uuid,
    parent_id bigint,
    created_at timestamptz not null default now(),
    avatar_url text,
    is_spoiler boolean not null default false,
    edited_at timestamptz,
    edit_count integer not null default 0,
    deleted_at timestamptz,
    deleted_by uuid
  );
  create index if not exists comments_slug_created_idx on comments (slug, created_at desc);
  create index if not exists comments_parent_idx on comments (parent_id);
  create index if not exists comments_user_idx on comments (user_id);
  create index if not exists comments_type_slug_idx on comments (type, slug);

  create table if not exists comment_edits (
    id bigserial primary key,
    comment_id bigint not null references comments(id) on delete cascade,
    previous_content text,
    previous_is_spoiler boolean,
    edited_by uuid,
    edited_at timestamptz not null default now()
  );
  create index if not exists comment_edits_comment_idx on comment_edits (comment_id);
`);

// Pastikan role aplikasi bisa menulis (kalau tabel dibuat oleh role lain).
try {
  await db.query("grant select, insert, update, delete on comments to ryukomik_social_app");
  await db.query("grant usage, select on sequence comment_edits_id_seq to ryukomik_social_app");
  await db.query("grant select, insert, update, delete on comment_edits to ryukomik_social_app");
} catch (error) {
  console.log("grant dilewati:", error.message);
}

const headers = { apikey: sbKey, Authorization: `Bearer ${sbKey}` };
let from = 0;
const pageSize = 1000;
let imported = 0;
let skipped = 0;
let maxId = 0;

for (;;) {
  const res = await fetch(
    `${sbUrl}/rest/v1/comments?select=*&order=id.asc&limit=${pageSize}&offset=${from}`,
    { headers },
  );
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const rows = await res.json();
  if (!rows.length) break;

  for (const row of rows) {
    const result = await db.query(
      `insert into comments (id, type, slug, chapter, content, author_name, user_id, parent_id, created_at, avatar_url, is_spoiler)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict (id) do nothing`,
      [row.id, row.type, row.slug, row.chapter, row.content, row.author_name, row.user_id,
       row.parent_id ?? null, row.created_at, row.avatar_url, Boolean(row.is_spoiler)],
    );
    if (result.rowCount) imported++;
    else skipped++;
    maxId = Math.max(maxId, Number(row.id) || 0);
  }

  from += pageSize;
  if (rows.length < pageSize) break;
}

// Sequence komentar baru harus di atas id terbesar.
await db.query(`select setval(pg_get_serial_sequence('comments','id'), $1, true)`, [maxId]).catch(async () => {
  // Kolom id bukan serial (bigint biasa): buat sequence terpisah untuk insert baru.
  await db.query("create sequence if not exists comments_id_seq");
  await db.query("alter sequence comments_id_seq owned by comments.id");
  await db.query("select setval('comments_id_seq', $1, true)", [maxId]);
  await db.query(`alter table comments alter column id set default nextval('comments_id_seq')`);
});

const stats = await db.query(`
  select count(*)::int total,
         count(*) filter (where parent_id is null)::int roots,
         count(*) filter (where parent_id is not null)::int replies,
         max(id)::bigint max_id
  from comments`);
const orphan = await db.query(`
  select count(*)::int n from comments c
  where c.parent_id is not null and not exists (select 1 from comments p where p.id = c.parent_id)`);

console.log("imported:", imported, "skipped:", skipped);
console.log("lokal:", JSON.stringify(stats.rows[0]));
console.log("balasan tanpa induk:", orphan.rows[0].n);

await db.end();
