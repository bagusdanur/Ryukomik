import "server-only";

import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const ROLE_CACHE_SECONDS = 10 * 60;

type RoleRow = {
  role?: string | null;
};

export type CachedRole = {
  role: string | null;
  isAdmin: boolean;
  isStaff: boolean;
};

export type AuthenticatedRole = CachedRole & {
  userId: string;
};

// auth.getUser() hits Supabase Auth's server (sessions, identities, mfa_*
// tables) on every call. Server-side callers (verifyAdminRequest,
// /api/me/role) can fire this many times within seconds — e.g. a dashboard
// page that calls several admin endpoints in parallel — so we reuse a
// validated token for a short window instead of re-verifying it every time.
const AUTH_USER_CACHE_MS = 45 * 1000;
const authUserCache = new Map<string, { at: number; userId: string }>();

function pruneAuthUserCache(now: number) {
  for (const [token, entry] of authUserCache) {
    if (now - entry.at >= AUTH_USER_CACHE_MS) {
      authUserCache.delete(token);
    }
  }
}

export async function getVerifiedUserId(token: string): Promise<string> {
  const now = Date.now();
  const cached = authUserCache.get(token);
  if (cached && now - cached.at < AUTH_USER_CACHE_MS) {
    return cached.userId;
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    throw new Error("Sesi login tidak valid.");
  }

  pruneAuthUserCache(now);
  authUserCache.set(token, { at: now, userId: authData.user.id });
  return authData.user.id;
}

const getCachedRoleByUserId = unstable_cache(
  async (userId: string): Promise<string | null> => {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return ((data || null) as RoleRow | null)?.role || null;
  },
  ["profile-role-v1"],
  {
    revalidate: ROLE_CACHE_SECONDS,
    tags: ["profile-role"],
  },
);

export async function getCachedRole(userId: string): Promise<CachedRole> {
  const role = await getCachedRoleByUserId(userId);
  return {
    role,
    isAdmin: role === "admin",
    isStaff: role === "staff",
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
