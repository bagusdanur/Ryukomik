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
};

export type AuthenticatedRole = CachedRole & {
  userId: string;
};

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
  };
}

export async function getRoleFromBearerToken(token: string): Promise<AuthenticatedRole> {
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    throw new Error("Sesi login tidak valid.");
  }

  const role = await getCachedRole(authData.user.id);
  return {
    userId: authData.user.id,
    ...role,
  };
}
