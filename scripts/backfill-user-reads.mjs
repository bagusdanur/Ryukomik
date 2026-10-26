import "dotenv/config";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

/**
 * Backfill SEKALI: riwayat baca Supabase -> tabel lokal user_reads (irisan 3).
 *
 * Tanpa backfill, chapter yang sudah pernah dibaca sebelum migrasi tidak
 * dikenali lokal sehingga bisa memberi XP ulang. Hanya 15 ribuan baris.
 *
 * Idempoten: on conflict (user_id, chapter_slug) do nothing.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.SOCIAL_DATABASE_URL;
if (!supabaseUrl || !serviceRoleKey || !databaseUrl) throw new Error("env belum lengkap");

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
const pool = new pg.Pool({ connectionString: databaseUrl, max: 3 });

let total = 0;
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("user_reads")
    .select("user_id, chapter_slug, created_at")
    .range(from, from + 999);
  if (error) throw new Error(`user_reads: ${error.message}`);
  const rows = (data || []).filter((row) => row.user_id && row.chapter_slug);
  if (rows.length) {
    const values = [];
    const params = [];
    for (const row of rows) {
      const offset = params.length;
      params.push(row.user_id, row.chapter_slug, row.created_at || new Date().toISOString());
      values.push(`($${offset + 1},$${offset + 2},$${offset + 3})`);
    }
    await pool.query(
      `insert into user_reads (user_id, chapter_slug, created_at)
       values ${values.join(",")}
       on conflict (user_id, chapter_slug) do nothing`,
      params,
    );
    total += rows.length;
  }
  if (!data || data.length < 1000) break;
}

const local = await pool.query("select count(*)::int as n from user_reads");
console.log(`scanned ${total} rows; local user_reads now ${local.rows[0].n}`);
await pool.end();
