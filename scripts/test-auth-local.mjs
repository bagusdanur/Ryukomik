#!/usr/bin/env node
/**
 * Smoke test auth lokal (Fase A).
 *
 * Menguji tiga jalur verifikasi token di server tanpa perlu sesi browser:
 *  1. token auth lokal (AUTH_JWT_SECRET)        -> harus 200
 *  2. token Supabase lama (SUPABASE_JWT_SECRET) -> harus 200 (masa transisi)
 *  3. token signature salah / kedaluwarsa       -> harus 401
 *
 * Pemakaian: node scripts/test-auth-local.mjs [baseUrl] [userId]
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const baseUrl = process.argv[2] || "https://ryukomik.my.id";
const userId = process.argv[3] || "5ee78339-b303-48d5-8905-ae8a24d9ebcc";

const env = {};
for (const line of readFileSync("/home/ryukomik/ryukomik/.env.local", "utf8").split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
}

const b64 = (input) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function makeToken(secret, { ttl = 3600, typ = "access", sub = userId } = {}) {
  const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64(JSON.stringify({ sub, iat: now - 5, exp: now + ttl, typ }));
  const sig = b64(createHmac("sha256", secret).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}

async function probe(label, token, expected) {
  const response = await fetch(`${baseUrl}/api/me/profile`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const ok = response.status === expected;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${response.status} (harap ${expected})`);
  return ok;
}

const ownSecret = env.AUTH_JWT_SECRET;
const legacySecret = env.SUPABASE_JWT_SECRET;
if (!ownSecret) {
  console.error("AUTH_JWT_SECRET belum diset di .env.local");
  process.exit(1);
}

const results = [];
results.push(await probe("token auth lokal", makeToken(ownSecret), 200));
results.push(await probe("token kedaluwarsa", makeToken(ownSecret, { ttl: -60 }), 401));
results.push(await probe("signature salah", makeToken(`${ownSecret}-palsu`), 401));
results.push(await probe("tanpa token", "", 401));
if (legacySecret) {
  results.push(await probe("token Supabase lama", makeToken(legacySecret, { typ: "authenticated" }), 200));
}

const failed = results.filter((value) => !value).length;
console.log(failed === 0 ? "\nSEMUA PASS" : `\n${failed} GAGAL`);
process.exit(failed === 0 ? 0 : 1);
