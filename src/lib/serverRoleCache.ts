import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { verifyAccessToken } from "@/lib/auth/jwt";

import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { socialQuery } from "@/lib/social/db";
import { isAdminAllowed, parseAdminAllowlist } from "@/lib/requestAuthPolicy";
import { evaluateBan } from "@/lib/banPolicy";

// Tag "profile-role" di-invalidasi admin saat role diubah (admin/users), jadi
// TTL panjang aman: perubahan role tetap langsung, query profiles turun 6x.
export const ROLE_CACHE_SECONDS = 60 * 60;

type RoleRow = {
  role?: string | null;
  is_banned?: boolean | null;
  banned_until?: string | null;
};

export type CachedRole = {
  role: string | null;
  isAdmin: boolean;
  isStaff: boolean;
  isBanned: boolean;
  bannedUntil: string | null;
};

export type AuthenticatedRole = CachedRole & {
  userId: string;
};

// auth.getUser() hits Supabase Auth's server (sessions, identities, mfa_*
// tables) on every call. Server-side callers (verifyAdminRequest,
// /api/me/role) can fire this many times within seconds — e.g. a dashboard
// page that calls several admin endpoints in parallel — so we reuse a
// validated token for a short window instead of re-verifying it every time.
const AUTH_USER_CACHE_MS = 5 * 60 * 1000;
const authUserCache = new Map<string, { at: number; userId: string; expiresAt: number }>();

function pruneAuthUserCache(now: number) {
  for (const [token, entry] of authUserCache) {
    if (now - entry.at >= AUTH_USER_CACHE_MS || now >= entry.expiresAt) {
      authUserCache.delete(token);
    }
  }
}

/**
 * Verifikasi JWT HS256 (project Supabase lama) secara lokal.
 *
 * Tanpa ini, `auth.getClaims()` tidak punya kunci untuk JWT simetris sehingga
 * SDK memanggil `GET /auth/v1/user` ke server Supabase pada tiap request —
 * sumber utama egress Auth (40 MB/hari) sekaligus memperlambat API.
 */
function verifyLegacyJwt(token: string, secret: string): { sub?: string; exp?: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signaturePart] = parts;

  const expected = createHmac("sha256", secret).update(`${headerPart}.${payloadPart}`).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signaturePart.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const json = Buffer.from(payloadPart.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json) as { sub?: string; exp?: number };
  } catch {
    return null;
  }
}

export async function getVerifiedUserId(token: string): Promise<string> {
  const now = Date.now();
  const cached = authUserCache.get(token);
  if (cached && now - cached.at < AUTH_USER_CACHE_MS && now < cached.expiresAt) {
    return cached.userId;
  }

  // 1) Token auth lokal (diterbitkan setelah login Google).
  // 2) Token Supabase lama (masa transisi, sebelum Supabase dimatikan).
  const ownSecret = process.env.AUTH_JWT_SECRET;
  const ownClaims = ownSecret ? verifyAccessToken(token, ownSecret) : null;
  const localSecret = process.env.SUPABASE_JWT_SECRET;
  let userId: string | undefined;
  let expSeconds: number | undefined;

  if (ownClaims) {
    userId = ownClaims.sub;
    expSeconds = ownClaims.exp;
  } else if (localSecret) {
    const claims = verifyLegacyJwt(token, localSecret);
    if (!claims || typeof claims.sub !== "string" || !claims.sub) {
      throw new Error("Sesi login tidak valid.");
    }
    userId = claims.sub;
    expSeconds = Number(claims.exp);
  } else {
    const { data: claimsData, error: authError } = await supabaseAdmin.auth.getClaims(token);
    if (authError) throw new Error("Sesi login tidak valid.");
    userId = claimsData?.claims?.sub;
    expSeconds = Number(claimsData?.claims?.exp);
    if (typeof userId !== "string" || !userId) throw new Error("Sesi login tidak valid.");
  }

  pruneAuthUserCache(now);
  const expiresAt = Number(expSeconds) * 1000;
  if (!Number.isFinite(expiresAt) || expiresAt <= now) throw new Error('Sesi login sudah berakhir.');
  authUserCache.set(token, { at: now, userId, expiresAt });
  return userId;
}

const getCachedRoleByUserId = unstable_cache(
  async (userId: string): Promise<RoleRow> => {
    // Sumber lokal (social_profiles): nol query Supabase per user per jam.
    const { rows } = await socialQuery<{
      role: string | null;
      is_banned: boolean | null;
      banned_until: string | null;
    }>("select role, is_banned, banned_until from social_profiles where user_id = $1", [userId]);

    const row = rows[0];
    if (!row) return {};
    return { role: row.role, is_banned: row.is_banned, banned_until: row.banned_until };
  },
  ["profile-role-v3"],
  {
    revalidate: ROLE_CACHE_SECONDS,
    tags: ["profile-role"],
  },
);

export async function getCachedRole(userId: string): Promise<CachedRole> {
  const row = await getCachedRoleByUserId(userId);
  const role = row.role || null;
  // Defence in depth: while profiles.role is writable by clients (permissive
  // RLS), admin rights also require membership of ADMIN_USER_IDS.
  const allowlist = parseAdminAllowlist(process.env.ADMIN_USER_IDS);
  const ban = evaluateBan({ is_banned: row.is_banned, banned_until: row.banned_until });
  return {
    role,
    isAdmin: isAdminAllowed(role, userId, allowlist),
    isStaff: role === "staff",
    isBanned: ban.banned,
    bannedUntil: ban.expiresAt,
  };
}

export async function getRoleFromBearerToken(token: string): Promise<AuthenticatedRole> {
  const userId = await getVerifiedUserId(token);
  const role = await getCachedRole(userId);
  return {
    userId,
    ...role,
  };
}
