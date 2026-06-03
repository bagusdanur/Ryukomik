"use client";

import { supabase } from "@/lib/supabaseClient";

export interface CachedProfile {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  is_premium?: boolean | null;
  premium_until?: string | null;
}

const PROFILE_TTL = 5 * 60 * 1000;
const profileCache = new Map<string, { at: number; data: CachedProfile | null }>();
const profileRequests = new Map<string, Promise<CachedProfile | null>>();

export function isActivePremiumProfile(
  profile?: Pick<CachedProfile, "is_premium" | "premium_until"> | null,
) {
  return Boolean(
    profile?.is_premium &&
      (!profile.premium_until || new Date(profile.premium_until) > new Date()),
  );
}

export function clearCachedProfile(userId?: string | null) {
  if (!userId) return;
  profileCache.delete(userId);
  profileRequests.delete(userId);
}

export function loadCachedProfile(userId: string, options: { force?: boolean } = {}) {
  const cached = profileCache.get(userId);
  if (!options.force && cached && Date.now() - cached.at < PROFILE_TTL) {
    return Promise.resolve(cached.data);
  }

  const pending = profileRequests.get(userId);
  if (!options.force && pending) return pending;

  const request = Promise.resolve(
    supabase
      .from("profiles")
      .select("id, username, avatar_url, role, is_premium, premium_until")
      .eq("id", userId)
      .maybeSingle(),
  ).then(({ data }) => {
    const profile = (data || null) as CachedProfile | null;
    profileCache.set(userId, { at: Date.now(), data: profile });
    profileRequests.delete(userId);
    return profile;
  });

  profileRequests.set(userId, request);
  return request;
}
