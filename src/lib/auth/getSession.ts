"use client";

import { supabase } from "@/lib/supabaseClient";

/**
 * Jembatan sesi: Supabase (user lama) → auth lokal (user baru).
 *
 * Bentuk hasilnya sengaja sama dengan `getSession()` supaya
 * seluruh pemanggil lama (`data.session?.access_token`) tidak perlu diubah
 * bentuk kodenya. Selama Supabase masih punya sesi, itu yang dipakai; kalau
 * tidak ada (user login lewat Google baru), diambil dari /api/auth/me.
 */
export type SessionLike = {
  access_token: string;
  user: { id: string; email?: string | null };
};

type SessionResult = { data: { session: SessionLike | null } };

const LOCAL_TTL_MS = 4 * 60 * 1000;
let localCache: { at: number; session: SessionLike | null } | null = null;
let inflight: Promise<SessionLike | null> | null = null;

export function clearLocalSessionCache() {
  localCache = null;
}

async function readLocalSession(): Promise<SessionLike | null> {
  const now = Date.now();
  if (localCache && now - localCache.at < LOCAL_TTL_MS) return localCache.session;
  if (inflight) return inflight;

  inflight = fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
    .then(async (response) => (response.ok ? response.json() : null))
    .then((json: { user?: { id?: string; email?: string | null }; accessToken?: string } | null) => {
      const id = json?.user?.id;
      const token = json?.accessToken;
      const session: SessionLike | null =
        id && token ? { access_token: token, user: { id, email: json?.user?.email ?? null } } : null;
      localCache = { at: Date.now(), session };
      return session;
    })
    .catch(() => {
      localCache = { at: Date.now(), session: null };
      return null;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export async function getSession(): Promise<SessionResult> {
  const supabaseSession = await supabase.auth
    .getSession()
    .then(({ data }) => data.session ?? null)
    .catch(() => null);

  if (supabaseSession?.access_token) {
    return { data: { session: supabaseSession as unknown as SessionLike } };
  }

  return { data: { session: await readLocalSession() } };
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await getSession();
  return data.session?.access_token ?? null;
}

export async function getViewerId(): Promise<string | null> {
  const { data } = await getSession();
  return data.session?.user?.id ?? null;
}
