#!/usr/bin/env node
/**
 * Daftarkan ulang webhook bot premium ke domain aktif.
 *
 * WAJIB dijalankan setiap kali domain situs berubah. Kalau tidak, Telegram
 * tetap mengirim tombol ACC/Tolak ke domain lama dan semua klik gagal
 * ("Wrong response from the webhook") — persis yang terjadi saat pindah dari
 * ryukomik.web.id ke ryukomik.com.
 *
 * Pakai: node scripts/telegram-set-webhook.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readEnv() {
  const merged = {};
  for (const file of [".env", ".env.local"]) {
    try {
      for (const line of readFileSync(join(ROOT, file), "utf8").split("\n")) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!match) continue;
        merged[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
      }
    } catch {
      /* file tidak ada */
    }
  }
  return merged;
}

const env = readEnv();
const token = env.TELEGRAM_PREMIUM_BOT_TOKEN;
const secret = env.TELEGRAM_WEBHOOK_SECRET;
const site = (env.NEXT_PUBLIC_SITE_URL || "https://ryukomik.com").replace(/\/+$/, "");

if (!token) {
  console.error("TELEGRAM_PREMIUM_BOT_TOKEN belum diisi.");
  process.exit(1);
}
if (!secret) {
  console.error("TELEGRAM_WEBHOOK_SECRET belum diisi — route webhook akan menolak semua update (401).");
  process.exit(1);
}

const url = `${site}/api/telegram/webhook`;

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url,
    secret_token: secret,
    allowed_updates: ["callback_query", "message"],
    drop_pending_updates: false,
  }),
});
const body = await res.json().catch(() => null);
console.log(`setWebhook -> ${url}`);
console.log(`  ok: ${body?.ok} ${body?.description ? `| ${body.description}` : ""}`);

const info = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then((r) => r.json()).catch(() => null);
const result = info?.result || {};
console.log(`  url aktif: ${result.url}`);
console.log(`  pending  : ${result.pending_update_count}`);
console.log(`  error    : ${result.last_error_message || "-"}`);

if (!body?.ok || result.url !== url) process.exit(1);
