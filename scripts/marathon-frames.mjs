#!/usr/bin/env node
/**
 * Pasang otomatis frame Juara 1/2/3 Marathon ke pemilik title mingguan.
 *
 * Aturan:
 *  - Peringkat 1/2/3 klasemen minggu berjalan (WIB, ISO week) memakai
 *    border marathon-1/2/3 tanpa perlu memilih di setting.
 *  - Border pilihan sebelumnya disimpan di marathon_frame_assignments, lalu
 *    dikembalikan saat user keluar dari 3 besar.
 *  - Kalau user sudah memakai frame marathon lain (mis. turun dari #1 ke #2),
 *    langsung diganti tanpa menyentuh border aslinya.
 *
 * Pemakaian: node scripts/marathon-frames.mjs [--dry-run]
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const envFile = path.join(root, ".env.local");
const env = Object.fromEntries(
  fs
    .readFileSync(envFile, "utf8")
    .split("\n")
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, "")]),
);

const dryRun = process.argv.includes("--dry-run");

function weekKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const t = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const client = new pg.Client({ connectionString: env.SOCIAL_DATABASE_URL });
await client.connect();

const period = weekKey();
const { rows: leaders } = await client.query(
  `select user_id from marathon_scores
    where period_type = 'weekly' and period_key = $1 and chapters > 0
    order by chapters desc, updated_at asc
    limit 3`,
  [period],
);

const wanted = new Map(leaders.map((row, index) => [row.user_id, `marathon-${index + 1}`]));
const { rows: current } = await client.query(
  "select user_id, border_id, prev_border, period_key from marathon_frame_assignments",
);

const currentMap = new Map(current.map((row) => [row.user_id, row]));
const changes = [];

for (const [userId, borderId] of wanted) {
  const existing = currentMap.get(userId);
  if (existing?.border_id === borderId) continue;
  changes.push({ userId, borderId, prev: existing?.prev_border ?? null });
}

// User yang sudah keluar dari 3 besar: kembalikan border aslinya.
const restores = current.filter((row) => !wanted.has(row.user_id));

for (const change of changes) {
  const { rows } = await client.query("select avatar_border, username from social_profiles where user_id = $1", [change.userId]);
  const row = rows[0];
  if (!row) continue;
  const isMarathonFrame = /^marathon-[123]$/.test(row.avatar_border || "");
  const prevBorder = change.prev ?? (isMarathonFrame ? null : row.avatar_border ?? null);
  console.log(`+ ${row.username ?? change.userId} ${row.avatar_border ?? "-"} -> ${change.borderId} (simpan: ${prevBorder ?? "-"})`);
  if (dryRun) continue;
  await client.query("update social_profiles set avatar_border = $2, updated_at = now() where user_id = $1", [change.userId, change.borderId]);
  await client.query(
    `insert into marathon_frame_assignments (user_id, border_id, prev_border, period_key, updated_at)
     values ($1,$2,$3,$4,now())
     on conflict (user_id) do update set border_id = excluded.border_id,
       prev_border = coalesce(marathon_frame_assignments.prev_border, excluded.prev_border),
       period_key = excluded.period_key, updated_at = now()`,
    [change.userId, change.borderId, prevBorder, period],
  );
}

for (const row of restores) {
  console.log(`- ${row.user_id} keluar dari 3 besar -> ${row.prev_border ?? "default"}`);
  if (dryRun) continue;
  await client.query("update social_profiles set avatar_border = $2, updated_at = now() where user_id = $1", [row.user_id, row.prev_border]);
  await client.query("delete from marathon_frame_assignments where user_id = $1", [row.user_id]);
}

console.log(`${dryRun ? "[dry-run] " : ""}periode ${period}: ${changes.length} dipasang, ${restores.length} dikembalikan`);
await client.end();
