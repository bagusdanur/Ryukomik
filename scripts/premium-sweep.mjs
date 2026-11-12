#!/usr/bin/env node
/**
 * Turunkan status premium yang masa aktifnya sudah lewat.
 *
 * `is_premium` adalah sumber kebenaran di hampir semua gate (badge VIP, kuota
 * download, notifikasi premium, ad-free), sementara `premium_until` hanya
 * dipakai saat memperpanjang. Tanpa sweep, `is_premium` bisa tertinggal `true`
 * setelah tanggal habis.
 *
 * Dijalankan cron tiap jam. Idempoten: hanya menyentuh baris yang sudah
 * kedaluwarsa.
 *
 *   node --env-file=.env.local scripts/premium-sweep.mjs
 */
import pg from "pg";

const connectionString = process.env.SOCIAL_DATABASE_URL;
if (!connectionString) {
  console.error("[premium-sweep] SOCIAL_DATABASE_URL tidak di-set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString, application_name: "premium-sweep" });

try {
  const { rows } = await pool.query(
    `update social_profiles
        set is_premium = false, updated_at = now()
      where is_premium = true
        and premium_until is not null
        and premium_until <= now()
      returning user_id, username, premium_source, premium_until`,
  );
  console.log(`[premium-sweep] ${new Date().toISOString()} kedaluwarsa: ${rows.length}`);
  for (const row of rows) {
    console.log(`  - ${row.username || row.user_id} (${row.premium_source || "-"}) s.d. ${row.premium_until?.toISOString?.() || row.premium_until}`);
  }
} catch (error) {
  console.error("[premium-sweep] gagal:", error?.message || error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
