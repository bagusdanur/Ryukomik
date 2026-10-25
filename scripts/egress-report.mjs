#!/usr/bin/env node
/**
 * Laporan agregat audit egress Supabase.
 *
 * Membaca satu atau lebih file JSONL hasil instrumen:
 *   - data/egress-audit.jsonl   (server: supabaseAdmin)
 *   - data/egress-client.jsonl  (browser: anon key)
 *   - data/egress-app-api.jsonl (app-api, kalau nanti dipasang)
 *
 * Pakai: node scripts/egress-report.mjs [file ...]
 * Output: tabel MB/hari, call/hari, byte/call per bucket + total.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["data/egress-audit.jsonl", "data/egress-client.jsonl", "data/egress-app-api.jsonl"];

const mb = (bytes) => (bytes / 1e6).toFixed(2);

for (const file of files) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) {
    console.log(`\n== ${file}: (tidak ada)`);
    continue;
  }

  const lines = readFileSync(path, "utf8").split("\n").filter(Boolean);
  const totals = new Map();
  let first = null;
  let last = null;
  let samples = 0;

  for (const line of lines) {
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    const ts = Date.parse(row.ts);
    if (!Number.isFinite(ts)) continue;
    samples += 1;
    if (first === null || ts < first) first = ts;
    if (last === null || ts > last) last = ts;
    for (const [key, bucket] of Object.entries(row.buckets || {})) {
      const acc = totals.get(key) || { bytes: 0, count: 0, rows: 0 };
      acc.bytes += Number(bucket.bytes) || 0;
      acc.count += Number(bucket.count) || 0;
      acc.rows += Number(bucket.rows) || 0;
      totals.set(key, acc);
    }
  }

  if (!samples) {
    console.log(`\n== ${file}: kosong`);
    continue;
  }

  const hours = Math.max((last - first) / 3_600_000, 1 / 60);
  const perDay = 24 / hours;
  const ranked = [...totals.entries()].sort((a, b) => b[1].bytes - a[1].bytes);
  const totalBytes = ranked.reduce((sum, [, v]) => sum + v.bytes, 0);

  console.log(`\n== ${file}`);
  console.log(`   ${samples} sampel, ${hours.toFixed(1)} jam, total ${mb(totalBytes)} MB (${mb(totalBytes * perDay)} MB/hari)`);
  console.log(`   ${"bucket".padEnd(34)}${"MB/hari".padStart(10)}${"call/hari".padStart(12)}${"B/call".padStart(9)}`);
  for (const [key, v] of ranked.slice(0, 20)) {
    console.log(
      `   ${key.padEnd(34)}${mb(v.bytes * perDay).padStart(10)}${Math.round(v.count * perDay).toString().padStart(12)}${Math.round(v.bytes / Math.max(v.count, 1)).toString().padStart(9)}`,
    );
  }
}
