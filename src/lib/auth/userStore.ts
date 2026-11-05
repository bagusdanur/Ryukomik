import "server-only";

import { socialQuery } from "@/lib/social/db";

/**
 * Penulisan status akun di auth lokal.
 *
 * Dipakai bersama `social_profiles` selama masa transisi: profile tetap sumber
 * kebenaran untuk otorisasi API, sementara tabel ini menyimpan status ban untuk
 * auth sendiri (dan mencabut sesi yang masih hidup).
 */
export async function setAuthBan(userId: string, bannedUntil: string | null): Promise<void> {
  await socialQuery(
    "update auth_users set banned_until = $2, updated_at = now() where id = $1",
    [userId, bannedUntil],
  );

  if (bannedUntil) {
    await socialQuery(
      "update auth_sessions set revoked_at = now() where user_id = $1 and revoked_at is null",
      [userId],
    );
  }
}

export type AuthUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  banned_until: string | null;
};

export async function findAuthUserByEmail(email: string): Promise<AuthUserRow | null> {
  const trimmed = email.trim();
  if (!trimmed) return null;
  const { rows } = await socialQuery<AuthUserRow>(
    `select id, email, full_name, avatar_url, banned_until
       from auth_users
      where lower(email) = lower($1)
      limit 1`,
    [trimmed],
  );
  return rows[0] ?? null;
}

function usernameFromEmail(email: string): string {
  const base = email.split("@")[0] || "user";
  const cleaned = base.toLowerCase().replace(/[^a-z0-9_]+/g, "").slice(0, 20) || "user";
  return cleaned.length >= 3 ? cleaned : `user${cleaned}`;
}

/**
 * Cari UUID lama lewat Supabase Auth (masa transisi).
 *
 * `auth_users.email` belum terisi sebelum user login ulang, jadi login Google
 * pertama perlu mencocokkan email ke akun Supabase agar UUID (XP, komentar,
 * maraton) tidak berubah. Panggilan ini hanya sekali per user, hasilnya
 * disimpan lokal sehingga tidak berulang.
 */
async function linkIdFromSupabaseByEmail(email: string): Promise<string | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;

  try {
    const response = await fetch(`${base}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { users?: Array<{ id?: string; email?: string | null }> } | Array<{ id?: string; email?: string | null }>;
    const list = Array.isArray(json) ? json : json.users ?? [];
    const match = list.find((entry) => entry.email?.toLowerCase() === email.toLowerCase());
    return match?.id ?? null;
  } catch {
    return null;
  }
}

export type GoogleProfile = {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
};

/**
 * Upsert user dari identitas Google tanpa mengubah UUID lama.
 * Urutan pencocokan: google_sub -> email di auth_users -> email di Supabase Auth.
 */
export async function upsertAuthUserFromGoogle(profile: GoogleProfile): Promise<AuthUserRow> {
  const { rows: bySub } = await socialQuery<AuthUserRow>(
    "select id, email, full_name, avatar_url, banned_until from auth_users where google_sub = $1 limit 1",
    [profile.sub],
  );
  let row = bySub[0] ?? null;

  if (!row) {
    const { rows: byEmail } = await socialQuery<AuthUserRow>(
      "select id, email, full_name, avatar_url, banned_until from auth_users where lower(email) = lower($1) limit 1",
      [profile.email],
    );
    row = byEmail[0] ?? null;
  }

  if (!row) {
    const legacyId = await linkIdFromSupabaseByEmail(profile.email);
    if (legacyId) {
      // UUID lama ketemu tapi belum ada di auth_users (mis. profil dibuat
      // setelah backfill): daftarkan dengan id yang sama, jangan bikin user baru.
      const { rows } = await socialQuery<AuthUserRow>(
        `insert into auth_users (id, email, google_sub, full_name, avatar_url, last_login_at)
         values ($1, $2, $3, $4, $5, now())
         on conflict (id) do update
           set email = coalesce(auth_users.email, excluded.email),
               google_sub = coalesce(auth_users.google_sub, excluded.google_sub),
               updated_at = now()
         returning id, email, full_name, avatar_url, banned_until`,
        [legacyId, profile.email, profile.sub, profile.name, profile.picture],
      );
      row = rows[0] ?? null;
    }
  }

  if (row) {
    const { rows } = await socialQuery<AuthUserRow>(
      `update auth_users
          set google_sub = $2,
              email = $3,
              full_name = coalesce($4, full_name),
              avatar_url = coalesce($5, avatar_url),
              last_login_at = now(),
              updated_at = now()
        where id = $1
        returning id, email, full_name, avatar_url, banned_until`,
      [row.id, profile.sub, profile.email, profile.name, profile.picture],
    );
    return rows[0];
  }

  // Benar-benar user baru: buat identitas + profil sosial.
  const { rows: created } = await socialQuery<AuthUserRow>(
    `insert into auth_users (id, email, google_sub, full_name, avatar_url, last_login_at)
     values (gen_random_uuid(), $1, $2, $3, $4, now())
     returning id, email, full_name, avatar_url, banned_until`,
    [profile.email, profile.sub, profile.name, profile.picture],
  );
  const newUser = created[0];

  let username = usernameFromEmail(profile.email);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { rows: taken } = await socialQuery<{ user_id: string }>(
      "select user_id from social_profiles where lower(username) = lower($1) limit 1",
      [username],
    );
    if (!taken[0]) break;
    username = `${usernameFromEmail(profile.email)}${Math.floor(Math.random() * 9000 + 1000)}`;
  }

  await socialQuery(
    `insert into social_profiles (user_id, username, avatar_url)
     values ($1, $2, $3)
     on conflict (user_id) do nothing`,
    [newUser.id, username, profile.picture],
  );

  return newUser;
}

export async function findAuthUserById(userId: string): Promise<AuthUserRow | null> {
  const { rows } = await socialQuery<AuthUserRow>(
    "select id, email, full_name, avatar_url, banned_until from auth_users where id = $1 limit 1",
    [userId],
  );
  return rows[0] ?? null;
}
