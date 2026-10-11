"use client";

import { supabase } from "@/lib/supabaseClient";

export interface CachedProfile {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  level?: number | null;
  xp?: number | null;
  role?: string | null;
  is_premium?: boolean | null;
  premium_until?: string | null;
  created_at?: string | null;
  total_comments?: number | null;
  total_reads?: number | null;
  show_public_reads?: boolean | null;
  show_public_comments?: boolean | null;
  show_public_join_date?: boolean | null;
}

const PROFILE_SELECT =
  "id, username, avatar_url, level, xp, role, is_premium, premium_until, created_at, total_comments, total_reads, show_public_reads, show_public_comments, show_public_join_date";

// Profile rows change rarely (username/avatar/premium), yet this is read by
// Navbar + every ad component on nearly every navigation. Serve cached data for
// PROFILE_TTL, then keep serving it while a single background refresh runs
// (stale-while-revalidate) up to PROFILE_STALE_TTL. Explicit invalidation
// (clearCachedProfile / "rk-profile-updated") still forces a fresh read right
// after a user edits their profile or activates premium, so nothing important
// stays stale.
const PROFILE_TTL = 15 * 60 * 1000;
const PROFILE_STALE_TTL = 60 * 60 * 1000;
const STORAGE_PREFIX = "rk-profile:";
const STORAGE_MAX = 8;

const profileCache = new Map<string, { at: number; data: CachedProfile | null }>();
const profileRequests = new Map<string, Promise<CachedProfile | null>>();
const profileListeners = new Map<string, Set<(profile: CachedProfile | null) => void>>();

function publishProfile(userId: string, profile: CachedProfile | null) {
  profileListeners.get(userId)?.forEach((listener) => listener(profile));
}

export function getProfile(userId?: string | null): CachedProfile | null {
  if (!userId) return null;
  return (profileCache.get(userId) || readStored(userId))?.data || null;
}

export function subscribeProfile(
  userId: string,
  listener: (profile: CachedProfile | null) => void,
) {
  let listeners = profileListeners.get(userId);
  if (!listeners) {
    listeners = new Set();
    profileListeners.set(userId, listeners);
  }
  listeners.add(listener);
  listener(getProfile(userId));
  return () => {
    listeners?.delete(listener);
    if (!listeners?.size) profileListeners.delete(userId);
  };
}

function readStored(userId: string): { at: number; data: CachedProfile | null } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: CachedProfile | null };
    return typeof parsed?.at === "number" ? parsed : null;
  } catch {
    return null;
  }
}

function writeStored(userId: string, entry: { at: number; data: CachedProfile | null }) {
  if (typeof window === "undefined") return;
  try {
    // Bound storage so a long session switching accounts cannot grow without
    // limit: drop the oldest entry beyond STORAGE_MAX.
    const keys: { key: string; at: number }[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
      try {
        const parsed = JSON.parse(window.sessionStorage.getItem(key) || "") as { at?: number };
        keys.push({ key, at: parsed?.at || 0 });
      } catch {
        keys.push({ key, at: 0 });
      }
    }
    if (keys.length >= STORAGE_MAX) {
      keys.sort((a, b) => a.at - b.at);
      for (const stale of keys.slice(0, keys.length - STORAGE_MAX + 1)) {
        window.sessionStorage.removeItem(stale.key);
      }
    }
    window.sessionStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(entry));
  } catch {
    // sessionStorage unavailable/full — the in-memory cache still applies.
  }
}

export function isActivePremiumProfile(
  profile?: Pick<CachedProfile, "is_premium" | "premium_until"> | null,
) {
  return Boolean(
    profile?.is_premium &&
      (!profile.premium_until || new Date(profile.premium_until) > new Date()),
  );
}

/** Pure staleness check so it can be unit-tested without a DOM. */
export function isStaleAt(at: number | null | undefined, now: number, ttl: number = PROFILE_TTL) {
  if (typeof at !== "number" || !Number.isFinite(at)) return true;
  return now - at >= ttl;
}

/**
 * True when the cached profile is missing or older than PROFILE_TTL.
 * Used to keep premium status "loading" during the stale-while-revalidate
 * window, so ads are never injected for a user whose premium state is not yet
 * confirmed by a fresh read.
 */
export function isProfileStale(userId?: string | null, now: number = Date.now()) {
  if (!userId) return true;
  const entry = profileCache.get(userId) || readStored(userId);
  if (!entry) return true;
  return isStaleAt(entry.at, now);
}

export function clearCachedProfile(userId?: string | null) {
  if (!userId) return;
  profileCache.delete(userId);
  profileRequests.delete(userId);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(STORAGE_PREFIX + userId);
    } catch {
      // ignore
    }
  }
  publishProfile(userId, null);
}

function fetchProfile(userId: string): Promise<CachedProfile | null> {
  return Promise.resolve(
    supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", userId)
      .maybeSingle(),
  ).then(({ data }) => {
    const profile = (data || null) as CachedProfile | null;
    const entry = { at: Date.now(), data: profile };
    profileCache.set(userId, entry);
    writeStored(userId, entry);
    profileRequests.delete(userId);
    publishProfile(userId, profile);
    return profile;
  }).catch((error) => {
    profileRequests.delete(userId);
    throw error;
  });
}

export function refreshProfile(userId: string) {
  profileCache.delete(userId);
  profileRequests.delete(userId);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(STORAGE_PREFIX + userId);
    } catch {
      // ignore
    }
  }
  return loadCachedProfile(userId, { force: true });
}

export function loadCachedProfile(userId: string, options: { force?: boolean } = {}) {
  const now = Date.now();
  const cached = profileCache.get(userId) || readStored(userId);
  if (cached && !profileCache.has(userId)) profileCache.set(userId, cached);

  const pending = profileRequests.get(userId);
  if (pending) return pending;

  if (!options.force && cached) {
    const age = now - cached.at;
    if (age < PROFILE_TTL) {
      return Promise.resolve(cached.data);
    }
    if (age < PROFILE_STALE_TTL) {
      // Serve the stale copy immediately; kick off exactly one refresh that
      // updates the cache for the next caller instead of blocking every mount.
      profileRequests.set(userId, fetchProfile(userId));
      return Promise.resolve(cached.data);
    }
  }

  const request = fetchProfile(userId);
  profileRequests.set(userId, request);
  return request;
}
