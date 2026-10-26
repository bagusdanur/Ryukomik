import "dotenv/config";
import { writeFileSync } from "node:fs";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

/**
 * Import identitas + hak akses + XP dari Supabase `profiles` ke Postgres lokal.
 *
 * Dipakai SEKALI untuk migrasi (Irisan 0). Setelah `profiles` menjadi sumber
 * lokal, script ini tidak dipakai lagi — bukan sinkron berkala.
 *
 * Sengaja TIDAK membawa bio/banner_url: dua kolom itu dimiliki database lokal
 * (diubah lewat /social-settings), jadi import tidak boleh menimpanya.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.SOCIAL_DATABASE_URL;

if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
  throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SOCIAL_DATABASE_URL are required");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const pool = new pg.Pool({ connectionString: databaseUrl, max: 3 });

const COLUMNS = [
  "id",
  "username",
  "avatar_url",
  "level",
  "role",
  "is_premium",
  "premium_until",
  "xp",
  "total_reads",
  "total_comments",
  "is_banned",
  "banned_until",
  "ban_reason",
  "banned_at",
  "banned_by",
  "show_public_reads",
  "show_public_comments",
  "show_public_join_date",
];

async function fetchProfiles() {
  const profiles = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("profiles")
      .select(COLUMNS.join(","))
      .range(from, from + 999);
    if (error) throw new Error(`profiles: ${error.message}`);
    profiles.push(...(data || []));
    if (!data || data.length < 1000) return profiles;
  }
}

async function syncProfiles(profiles) {
  for (let index = 0; index < profiles.length; index += 200) {
    const chunk = profiles.slice(index, index + 200);
    const values = [];
    const params = [];
    for (const p of chunk) {
      const offset = params.length;
      params.push(
        p.id,
        p.username || `user-${p.id.slice(0, 8)}`,
        p.avatar_url,
        Number(p.level) || 1,
        p.role,
        Boolean(p.is_premium),
        p.premium_until,
        Number(p.xp) || 0,
        Number(p.total_reads) || 0,
        Number(p.total_comments) || 0,
        Boolean(p.is_banned),
        p.banned_until,
        p.ban_reason,
        p.banned_at,
        p.banned_by,
        p.show_public_reads !== false,
        p.show_public_comments !== false,
        p.show_public_join_date !== false,
      );
      values.push(`(${Array.from({ length: 18 }, (_, i) => `$${offset + i + 1}`).join(",")},now())`);
    }
    await pool.query(
      `insert into social_profiles
        (user_id,username,avatar_url,level,role,is_premium,premium_until,xp,
         total_reads,total_comments,is_banned,banned_until,ban_reason,banned_at,banned_by,
         show_public_reads,show_public_comments,show_public_join_date,source_updated_at)
       values ${values.join(",")}
       on conflict (user_id) do update set
         username=excluded.username,
         avatar_url=excluded.avatar_url,
         level=excluded.level,
         role=excluded.role,
         is_premium=excluded.is_premium,
         premium_until=excluded.premium_until,
         xp=excluded.xp,
         total_reads=excluded.total_reads,
         total_comments=excluded.total_comments,
         is_banned=excluded.is_banned,
         banned_until=excluded.banned_until,
         ban_reason=excluded.ban_reason,
         banned_at=excluded.banned_at,
         banned_by=excluded.banned_by,
         show_public_reads=excluded.show_public_reads,
         show_public_comments=excluded.show_public_comments,
         show_public_join_date=excluded.show_public_join_date,
         source_updated_at=now(),
         updated_at=now()`,
      params,
    );
  }
}

try {
  const profiles = await fetchProfiles();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(`data/profile-import-${stamp}.jsonl`, profiles.map((p) => JSON.stringify(p)).join("\n"));
  await syncProfiles(profiles);

  const activity = await pool.query(
    `update social_activity_events event
     set actor_name=profile.username
     from social_profiles profile
     where event.actor_id=profile.user_id
       and event.actor_name is distinct from profile.username`,
  );
  const notifications = await pool.query(
    `update social_notifications notification
     set actor_name=profile.username
     from social_profiles profile
     where notification.actor_id=profile.user_id
       and notification.actor_name is distinct from profile.username`,
  );
  console.log(`Imported ${profiles.length} profiles; updated ${activity.rowCount} activities and ${notifications.rowCount} notifications.`);
} finally {
  await pool.end();
}
