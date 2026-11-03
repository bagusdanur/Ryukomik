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

export async function findAuthUserById(userId: string): Promise<AuthUserRow | null> {
  const { rows } = await socialQuery<AuthUserRow>(
    "select id, email, full_name, avatar_url, banned_until from auth_users where id = $1 limit 1",
    [userId],
  );
  return rows[0] ?? null;
}
