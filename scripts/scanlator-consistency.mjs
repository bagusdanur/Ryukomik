#!/usr/bin/env node
/**
 * Pemeriksa konsistensi data Scanlator.
 * Dijalankan harian (cron). Melaporkan ke Telegram hanya kalau ada masalah.
 *
 * Yang diperiksa:
 *  1. Pengajuan approved tapi profil tim tidak ada (masalah yang pernah bikin loop studio)
 *  2. Profil tim ada tapi pengajuan approved-nya tidak ada
 *  3. Seri project menunjuk handle scanlator yang tidak terdaftar
 *  4. User bertombstone (sudah dihapus admin) tapi profilnya masih ada
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/home/ryukomik/ryukomik";

function loadEnv() {
  const env = {};
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return env;
}

const env = loadEnv();
const SOCIAL_DB = env.SOCIAL_DATABASE_URL;
const TOKEN = env.TELEGRAM_PREMIUM_BOT_TOKEN || "";
const CHAT_ID = process.env.UPTIME_CHAT_ID || "8706658046";
const PROJECT_API = "http://127.0.0.1:4100";
const PROJECT_TOKEN = env.PROJECT_API_INTERNAL_TOKEN || "";

function sql(query) {
  const out = execFileSync("psql", [SOCIAL_DB, "-At", "-F", "\t", "-c", query], { encoding: "utf8" });
  return out.trim() ? out.trim().split("\n").map((line) => line.split("\t")) : [];
}

async function api(path) {
  const res = await fetch(`${PROJECT_API}${path}`, {
    headers: { authorization: `Bearer ${PROJECT_TOKEN}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`project api ${res.status}`);
  return res.json();
}

async function sendTelegram(text) {
  if (!TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
  }).catch(() => undefined);
}

const issues = [];
let fixed = 0;

// 1. approved tanpa profil
const missing = sql(`
  select a.user_id::text, a.handle, a.team_name
    from scanlator_applications a
   where a.status = 'approved'
     and not exists (select 1 from scanlator_profiles s where s.user_id = a.user_id)
     and not exists (select 1 from scanlator_deleted d where d.user_id = a.user_id or d.handle = a.handle)
`);

for (const [userId, handle, team] of missing) {
  try {
    sql(`
      insert into scanlator_profiles (user_id, handle, team_name, status)
      values ('${userId}', '${handle.replace(/'/g, "''")}', '${team.replace(/'/g, "''")}', 'active')
      on conflict (user_id) do nothing
    `);
    fixed += 1;
    issues.push(`• ACC tanpa profil: <b>${team}</b> (@${handle}) → profil dibuat ulang`);
  } catch (err) {
    issues.push(`• ACC tanpa profil: ${team} (@${handle}) → GAGAL diperbaiki: ${String(err).slice(0, 80)}`);
  }
}

// 2. profil tanpa pengajuan approved
const orphanProfiles = sql(`
  select s.handle, s.team_name
    from scanlator_profiles s
   where not exists (
     select 1 from scanlator_applications a
      where a.user_id = s.user_id and a.status = 'approved'
   )
`);
for (const [handle, team] of orphanProfiles) {
  issues.push(`• Profil tanpa pengajuan approved: <b>${team}</b> (@${handle})`);
}

// 3. seri menunjuk handle yang tidak terdaftar
const handles = new Set(sql(`select handle from scanlator_profiles`).map((r) => r[0]));
try {
  const list = await api("/admin/projects?limit=100&page=1");
  const dangling = (list.data || []).filter((p) => p.scanlator_handle && !handles.has(p.scanlator_handle));
  for (const p of dangling.slice(0, 10)) {
    issues.push(`• Seri <b>${String(p.title).slice(0, 40)}</b> menunjuk handle hilang: @${p.scanlator_handle}`);
  }
  if (dangling.length > 10) issues.push(`• …dan ${dangling.length - 10} seri lain dengan handle hilang`);
} catch (err) {
  issues.push(`• Gagal membaca daftar project: ${String(err).slice(0, 80)}`);
}

// 4. tombstone tapi profil masih ada
const resurrected = sql(`
  select s.handle, s.team_name
    from scanlator_profiles s
    join scanlator_deleted d on d.user_id = s.user_id
`);
for (const [handle, team] of resurrected) {
  issues.push(`• Tim dihapus tapi profil masih ada: <b>${team}</b> (@${handle})`);
}

if (issues.length) {
  const text = [
    "🧩 <b>Cek konsistensi Scanlator</b>",
    `Ditemukan ${issues.length} masalah${fixed ? ` · ${fixed} diperbaiki otomatis` : ""}`,
    ...issues,
    `Waktu: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`,
  ].join("\n");
  await sendTelegram(text);
  console.log(text);
} else {
  console.log("[consistency] semua sinkron");
}
