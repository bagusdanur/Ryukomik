#!/usr/bin/env node
/**
 * Kirim URL ke IndexNow (Bing, Yandex, Seznam, Naver).
 *
 * Pemakaian:
 *   node scripts/indexnow.mjs                 # semua URL dari sitemap
 *   node scripts/indexnow.mjs --limit 50      # 50 URL teratas saja
 *   node scripts/indexnow.mjs https://ryukomik.web.id/chapter/... [url lain...]
 *
 * Kunci dibaca dari public/indexnow-key.txt dan file kunci publik
 * public/<kunci>.txt harus bisa diakses di https://<host>/<kunci>.txt
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const ORIGIN = (process.env.SITE_ORIGIN || "https://ryukomik.web.id").replace(/\/+$/, "");
const HOST = new URL(ORIGIN).host;

function readKey() {
  const raw = readFileSync(join(ROOT, "public", "indexnow-key.txt"), "utf8").trim();
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(raw)) throw new Error("Kunci IndexNow tidak valid.");
  return raw;
}

async function urlsFromSitemap() {
  const res = await fetch(`${ORIGIN}/sitemap.xml`, { headers: { "user-agent": "Ryukomik-IndexNow/1.0" } });
  if (!res.ok) throw new Error(`sitemap ${res.status}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  return [...new Set(urls.filter((u) => u.startsWith(ORIGIN)))];
}

async function submit(key, urlList) {
  const body = {
    host: HOST,
    key,
    keyLocation: `${ORIGIN}/${key}.txt`,
    urlList,
  };
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  return { status: res.status, text: text.slice(0, 300) };
}

const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 0;
const explicit = args.filter((a) => a.startsWith("http"));

const key = readKey();
let urls = explicit.length ? explicit : await urlsFromSitemap();
if (limit > 0) urls = urls.slice(0, limit);

console.log(`host      : ${HOST}`);
console.log(`key file  : ${ORIGIN}/${key}.txt`);
console.log(`url       : ${urls.length}`);

if (!urls.length) {
  console.error("Tidak ada URL untuk dikirim.");
  process.exit(1);
}

// IndexNow membatasi 10.000 URL per permintaan.
let ok = 0;
let failed = 0;
for (let i = 0; i < urls.length; i += 10000) {
  const batch = urls.slice(i, i + 10000);
  const { status, text } = await submit(key, batch);
  // 200 = diterima, 202 = diterima (sedang diproses).
  const good = status === 200 || status === 202;
  if (good) ok += batch.length;
  else failed += batch.length;
  console.log(`batch ${i / 10000 + 1}: HTTP ${status} ${good ? "OK" : "GAGAL"} ${text ? `— ${text}` : ""}`);
}

console.log(`selesai: ${ok} URL terkirim, ${failed} gagal`);
process.exit(failed > 0 ? 1 : 0);
