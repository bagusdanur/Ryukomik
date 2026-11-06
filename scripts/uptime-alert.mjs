#!/usr/bin/env node
/**
 * Uptime monitor sederhana untuk Ryukomik.
 * - Cek halaman utama tiap 2 menit.
 * - Kirim alert Telegram hanya saat status BERUBAH (down / pulih).
 * - Butuh 2 kegagalan berurutan sebelum dianggap down (hindari false alarm).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = "/home/ryukomik/ryukomik";
const STATE_DIR = "/home/ryukomik/.config/ryukomik-uptime";
const STATE_FILE = join(STATE_DIR, "state.json");
const INTERVAL_MS = 120_000;
const TIMEOUT_MS = 12_000;
const FAIL_THRESHOLD = 2;

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // diamkan: alert hanya aktif kalau token tersedia
  }
  return env;
}

const env = loadEnv();
const TOKEN = env.TELEGRAM_PREMIUM_BOT_TOKEN || "";
const CHAT_ID = process.env.UPTIME_CHAT_ID || "8706658046";
const TARGETS = [
  { name: "Website", url: "https://ryukomik.my.id/" },
  { name: "API project", url: "https://ryukomik.my.id/api/project/pustaka?page=1" },
];

function readState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { down: false, since: null, failures: 0 };
  }
}

function writeState(state) {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state));
}

async function check(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow", headers: { "user-agent": "RyukomikUptime/1.0" } });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function sendTelegram(text) {
  if (!TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
  } catch (err) {
    console.error("[uptime] gagal kirim telegram:", err instanceof Error ? err.message : err);
  }
}

function minutesSince(iso) {
  if (!iso) return 0;
  return Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
}

async function tick() {
  const results = await Promise.all(TARGETS.map(async (t) => ({ ...t, ok: await check(t.url) })));
  const failed = results.filter((r) => !r.ok);
  const state = readState();

  if (failed.length) {
    state.failures = (state.failures || 0) + 1;
    console.log(`[uptime] gagal ${state.failures}/${FAIL_THRESHOLD}: ${failed.map((f) => f.name).join(", ")}`);

    if (!state.down && state.failures >= FAIL_THRESHOLD) {
      state.down = true;
      state.since = new Date().toISOString();
      await sendTelegram(
        `🔴 <b>Ryukomik DOWN</b>\n${failed.map((f) => `• ${f.name}: ${f.url}`).join("\n")}\nWaktu: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`,
      );
    }
  } else {
    if (state.down) {
      await sendTelegram(
        `🟢 <b>Ryukomik pulih</b>\nDown sekitar ${minutesSince(state.since)} menit.\nWaktu: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`,
      );
    }
    state.down = false;
    state.since = null;
    state.failures = 0;
    console.log("[uptime] semua normal");
  }

  writeState(state);
}

console.log(`[uptime] monitor aktif · cek tiap ${INTERVAL_MS / 1000}s · ${TARGETS.map((t) => t.name).join(", ")}`);
await tick();
setInterval(() => { void tick(); }, INTERVAL_MS);
