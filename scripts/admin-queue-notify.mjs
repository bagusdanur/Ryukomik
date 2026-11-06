#!/usr/bin/env node
/**
 * Notifikasi antrean Scanlator ke admin lewat Telegram.
 * - Cek tiap 5 menit: pengajuan pending, revisi chapter menunggu ACC, laporan open.
 * - Kirim saat jumlah antrean NAIK (throttle 10 menit), plus pengingat harian
 *   sekali sehari kalau masih ada antrean.
 * - `--force` mengirim ringkasan sekarang (untuk uji).
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/home/ryukomik/ryukomik";
const STATE_DIR = "/home/ryukomik/.config/ryukomik-adminqueue";
const STATE_FILE = join(STATE_DIR, "state.json");
const INTERVAL_MS = 5 * 60 * 1000;
const THROTTLE_MS = 10 * 60 * 1000;

function loadEnvFile(path) {
  const env = {};
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // abaikan
  }
  return env;
}

const env = loadEnvFile(join(ROOT, ".env.local"));
const projectEnv = loadEnvFile("/home/ryukomik/ryukomik-project-db/.env");
const SOCIAL_DB = env.SOCIAL_DATABASE_URL;
const PROJECT_DB = projectEnv.PROJECT_DATABASE_URL;
const TOKEN = env.TELEGRAM_PREMIUM_BOT_TOKEN || "";
const CHAT_ID = process.env.ADMIN_QUEUE_CHAT_ID || "8706658046";
const DASHBOARD_URL = "https://ryukomik.my.id/dashboard";

const force = process.argv.includes("--force");

function sql(db, query) {
  const out = execFileSync("psql", [db, "-At", "-c", query], { encoding: "utf8" });
  return Number(out.trim() || 0);
}

function readState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { lastTotal: 0, lastSentAt: 0, lastDaily: "" };
  }
}

function writeState(state) {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state));
}

async function sendTelegram(text) {
  if (!TOKEN) {
    console.error("[admin-queue] token Telegram tidak ada");
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (!res.ok) console.error("[admin-queue] telegram gagal:", res.status, await res.text().catch(() => ""));
}

async function tick() {
  let applications = 0;
  let revisions = 0;
  let reports = 0;

  try {
    applications = sql(SOCIAL_DB, "select count(*) from scanlator_applications where status = 'pending'");
    reports = sql(SOCIAL_DB, "select count(*) from scanlator_reports where status = 'open'");
  } catch (err) {
    console.error("[admin-queue] gagal baca DB sosial:", err instanceof Error ? err.message : err);
  }

  try {
    revisions = sql(PROJECT_DB, "select count(*) from project_chapters where review_status = 'pending' and is_published = true");
  } catch (err) {
    console.error("[admin-queue] gagal baca DB project:", err instanceof Error ? err.message : err);
  }

  const total = applications + revisions + reports;
  const state = readState();
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date()));

  const summary = [
    "📥 <b>Antrean Scanlator</b>",
    `• Pengajuan: <b>${applications}</b>`,
    `• Revisi chapter: <b>${revisions}</b>`,
    `• Laporan: <b>${reports}</b>`,
    `<a href="${DASHBOARD_URL}">Buka dashboard</a>`,
  ].join("\n");

  const increased = total > state.lastTotal;
  const throttled = now - (state.lastSentAt || 0) < THROTTLE_MS;

  if (force) {
    await sendTelegram(summary);
    state.lastTotal = total;
    state.lastSentAt = now;
    console.log("[admin-queue] ringkasan dikirim (force):", { applications, revisions, reports });
  } else if (total > 0 && increased && !throttled) {
    await sendTelegram(summary);
    state.lastTotal = total;
    state.lastSentAt = now;
    console.log("[admin-queue] antrean naik → kirim:", { applications, revisions, reports });
  } else if (total > 0 && state.lastDaily !== today && hour >= 8) {
    await sendTelegram(`${summary}\n<i>Pengingat harian — antrean belum diproses.</i>`);
    state.lastDaily = today;
    state.lastSentAt = now;
    console.log("[admin-queue] pengingat harian dikirim");
  } else {
    state.lastTotal = total;
    console.log("[admin-queue] antrean:", { applications, revisions, reports }, "tidak ada notifikasi");
  }

  writeState(state);
}

console.log(`[admin-queue] monitor antrean aktif · cek tiap ${INTERVAL_MS / 60000} menit`);
await tick();
if (process.argv.includes("--once")) process.exit(0);
setInterval(() => { void tick(); }, INTERVAL_MS);
