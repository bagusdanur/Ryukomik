// Backfill sekali jalan: salin total_reads/total_comments dari Supabase profiles
// ke social_profiles (PostgreSQL VPS) supaya badge komunitas langsung menampilkan
// angka nyata. Setelah ini sinkronisasi berjalan otomatis via ensureSocialProfile.
import { readFileSync } from "fs";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync("/home/ryukomik/ryukomik/.env.local", "utf8");
const get = (k) =>
  env.split("\n").find((l) => l.startsWith(k + "="))?.slice(k.length + 1).trim();

const supabase = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));

// 1) baca semua profiles (kolom kecil: id + 2 angka)
const all = [];
for (let offset = 0; ; offset += 500) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, total_reads, total_comments")
    .range(offset, offset + 499);
  if (error) throw new Error(error.message);
  all.push(...data);
  if (data.length < 500) break;
}
console.log("profiles dibaca:", all.length);

// 2) tulis ke social_profiles (batch)
const db = new pg.Client({ connectionString: get("SOCIAL_DATABASE_URL") });
await db.connect();
let updated = 0;
for (let i = 0; i < all.length; i += 400) {
  const batch = all.slice(i, i + 400);
  const res = await db.query(
    `update social_profiles sp
       set total_reads = v.total_reads, total_comments = v.total_comments
     from (select * from unnest($1::uuid[], $2::int[], $3::int[]))
       as v(id, total_reads, total_comments)
     where sp.user_id = v.id`,
    [
      batch.map((p) => p.id),
      batch.map((p) => Number(p.total_reads) || 0),
      batch.map((p) => Number(p.total_comments) || 0),
    ],
  );
  updated += res.rowCount || 0;
}
console.log("social_profiles di-update:", updated);

const check = await db.query(
  "select count(*)::int total, count(*) filter (where total_reads >= 1000)::int veteran, count(*) filter (where total_reads >= 300)::int rajin from social_profiles",
);
console.log("isi social_profiles:", check.rows[0]);
await db.end();
