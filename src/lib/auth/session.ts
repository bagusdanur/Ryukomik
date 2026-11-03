import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { socialQuery } from "@/lib/social/db";

export const SESSION_COOKIE = "rk_session";
export const SESSION_TTL_DAYS = 30;

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type SessionMeta = { userAgent?: string | null; ip?: string | null };

/** Membuat sesi lokal + refresh token (disimpan sebagai hash, bukan plaintext). */
export async function createSession(
  userId: string,
  meta: SessionMeta = {},
): Promise<{ refreshToken: string; expiresAt: Date }> {
  const refreshToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await socialQuery(
    `insert into auth_sessions (user_id, refresh_hash, user_agent, ip, expires_at)
     values ($1, $2, $3, $4, $5)`,
    [userId, hashRefreshToken(refreshToken), meta.userAgent ?? null, meta.ip ?? null, expiresAt.toISOString()],
  );

  return { refreshToken, expiresAt };
}

/** Validasi refresh token; perbarui last_used_at. */
export async function resolveSession(refreshToken: string): Promise<{ userId: string } | null> {
  if (!refreshToken) return null;
  const { rows } = await socialQuery<{ user_id: string; expires_at: string; banned_until: string | null }>(
    `select s.user_id, s.expires_at, u.banned_until
       from auth_sessions s
       join auth_users u on u.id = s.user_id
      where s.refresh_hash = $1
        and s.revoked_at is null
      limit 1`,
    [hashRefreshToken(refreshToken)],
  );
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;

  await socialQuery(
    "update auth_sessions set last_used_at = now() where refresh_hash = $1",
    [hashRefreshToken(refreshToken)],
  );

  return { userId: row.user_id };
}

export async function revokeSession(refreshToken: string): Promise<void> {
  if (!refreshToken) return;
  await socialQuery(
    "update auth_sessions set revoked_at = now() where refresh_hash = $1 and revoked_at is null",
    [hashRefreshToken(refreshToken)],
  );
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await socialQuery(
    "update auth_sessions set revoked_at = now() where user_id = $1 and revoked_at is null",
    [userId],
  );
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}
