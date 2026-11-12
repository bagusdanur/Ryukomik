#!/usr/bin/env node
/**
 * Backfill benefit premium untuk Scanlator yang dulu hanya menerima
 * `premium_until`/`premium_source` tanpa `is_premium = true`.
 *
 * Aman dijalankan berulang: hanya menyentuh baris `premium_source='scanlator'`
 * yang belum premium tapi masa aktifnya masih berlaku.
 *
 *   node --env-file=.env.local scripts/backfill-scanlator-premium.mjs [--dry-run]
 */
import pg from "pg";

const dryRun = process.argv.includes("--dry-run");
const connectionString = process.env.SOCIAL_DATABASE_URL;
if (!connectionString) {
  console.error("[backfill-scanlator-premium] SOCIAL_DATABASE_URL tidak di-set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString, application_name: "backfill-scanlator-premium" });

try {
  const target = `
    select p.user_id, p.username, p.premium_until
      from social_profiles p
      join scanlator_profiles s on s.user_id = p.user_id
     where s.status <> 'revoked'
       and not p.is_premium
       and p.premium_source = 'scanlator'
       and (p.premium_until is null or p.premium_until > now())`;

  const { rows } = await pool.query(target);
  console.log(`[backfill] kandidat: ${rows.length}`);
  for (const row of rows) {
    console.log(`  - ${row.username || row.user_id} s.d. ${row.premium_until?.toISOString?.() || row.premium_until}`);
  }
  if (dryRun) {
    console.log("[backfill] dry-run, tidak ada yang diubah");
  } else if (rows.length) {
    const { rowCount } = await pool.query(
      `update social_profiles p
          set is_premium = true, updated_at = now()
        from scanlator_profiles s
       where s.user_id = p.user_id
         and s.status <> 'revoked'
         and not p.is_premium
         and p.premium_source = 'scanlator'
         and (p.premium_until is null or p.premium_until > now())`,
    );
    console.log(`[backfill] diaktifkan: ${rowCount}`);
  } else {
    console.log("[backfill] tidak ada yang perlu diubah");
  }
} catch (error) {
  console.error("[backfill] gagal:", error?.message || error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
