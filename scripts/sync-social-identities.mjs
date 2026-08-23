import "dotenv/config";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

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

async function fetchProfiles() {
  const profiles = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,username,avatar_url,level,role,is_premium")
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
    for (const profile of chunk) {
      const offset = params.length;
      params.push(
        profile.id,
        profile.username || `user-${profile.id.slice(0, 8)}`,
        profile.avatar_url,
        profile.level || 1,
        profile.role,
        Boolean(profile.is_premium),
      );
      values.push(`($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},$${offset + 6},now())`);
    }
    await pool.query(
      `insert into social_profiles
        (user_id,username,avatar_url,level,role,is_premium,source_updated_at)
       values ${values.join(",")}
       on conflict (user_id) do update set
         username=excluded.username,
         avatar_url=excluded.avatar_url,
         level=excluded.level,
         role=excluded.role,
         is_premium=excluded.is_premium,
         source_updated_at=now(),
         updated_at=now()`,
      params,
    );
  }
}

try {
  const profiles = await fetchProfiles();
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
  console.log(`Synced ${profiles.length} identities; updated ${activity.rowCount} activities and ${notifications.rowCount} notifications.`);
} finally {
  await pool.end();
}
