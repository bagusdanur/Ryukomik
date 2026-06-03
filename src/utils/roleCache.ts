"use client";

import { supabase } from "@/lib/supabaseClient";

export const ROLE_CACHE_MS = 10 * 60 * 1000;

export type CachedRole = {
  role: string | null;
  isAdmin: boolean;
};

const memoryCache = new Map<string, { at: number; data: CachedRole }>();
const pendingRequests = new Map<string, Promise<CachedRole>>();

function getStorageKey(userId: string) {
  return `rk-role-cache:${userId}`;
}

function readSessionCache(userId: string) {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(getStorageKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { at?: number; data?: CachedRole };
    if (!parsed.at || !parsed.data || Date.now() - parsed.at > ROLE_CACHE_MS) {
      sessionStorage.removeItem(getStorageKey(userId));
      return null;
    }

    return { at: parsed.at, data: parsed.data };
  } catch {
    return null;
  }
}

function writeSessionCache(userId: string, data: CachedRole) {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(
      getStorageKey(userId),
      JSON.stringify({ at: Date.now(), data }),
    );
  } catch {
    // Session storage is a best-effort cache.
  }
}

export function clearCachedRole(userId?: string | null) {
  if (!userId) return;
  memoryCache.delete(userId);
  pendingRequests.delete(userId);

  if (typeof window !== "undefined") {
    sessionStorage.removeItem(getStorageKey(userId));
  }
}

export async function loadCachedRole(
  userId: string,
  options: { force?: boolean } = {},
): Promise<CachedRole> {
  const cached = memoryCache.get(userId);
  if (!options.force && cached && Date.now() - cached.at < ROLE_CACHE_MS) {
    return cached.data;
  }

  const sessionCached = !options.force ? readSessionCache(userId) : null;
  if (sessionCached) {
    memoryCache.set(userId, sessionCached);
    return sessionCached.data;
  }

  const pending = pendingRequests.get(userId);
  if (!options.force && pending) return pending;

  const request = supabase.auth
    .getSession()
    .then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) return { role: null, isAdmin: false };

      const res = await fetch("/api/me/role", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Gagal memuat role.");

      return {
        role: typeof json?.role === "string" ? json.role : null,
        isAdmin: json?.isAdmin === true,
      } satisfies CachedRole;
    })
    .then((role) => {
      const cacheEntry = { at: Date.now(), data: role };
      memoryCache.set(userId, cacheEntry);
      writeSessionCache(userId, role);
      pendingRequests.delete(userId);
      return role;
    })
    .catch((error) => {
      pendingRequests.delete(userId);
      throw error;
    });

  pendingRequests.set(userId, request);
  return request;
}
