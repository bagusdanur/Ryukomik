"use client";

import { supabase } from "@/lib/supabaseClient";
import { clearCachedProfile, refreshProfile } from "@/utils/profileCache";

/**
 * Polling ringan ke API kita sendiri (database lokal) untuk mendeteksi
 * perubahan premium/role yang dilakukan admin — bukan lewat Supabase, jadi
 * tidak menambah egress. Hanya berjalan saat tab terlihat.
 */

const POLL_MS = 60_000;
const storageKey = (userId: string) => `rk-profile-signal:${userId}`;

function readVersion(userId: string): number {
  try {
    return Number(window.localStorage.getItem(storageKey(userId)) || 0) || 0;
  } catch {
    return 0;
  }
}

function writeVersion(userId: string, version: number) {
  try {
    window.localStorage.setItem(storageKey(userId), String(version));
  } catch {
    // best-effort
  }
}

export function startProfileSignalWatcher(userId: string): () => void {
  let stopped = false;
  let timer: number | null = null;

  const schedule = () => {
    if (stopped) return;
    timer = window.setTimeout(() => void check(), POLL_MS);
  };

  async function check() {
    timer = null;
    if (stopped) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      schedule();
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        schedule();
        return;
      }

      const response = await fetch("/api/social/me/profile-version", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        schedule();
        return;
      }

      const payload = (await response.json()) as { version?: number };
      const version = Number(payload.version || 0);
      if (version && version !== readVersion(userId)) {
        writeVersion(userId, version);
        clearCachedProfile(userId);
        await refreshProfile(userId);
      }
    } catch {
      // diamkan: sinyal bersifat pelengkap
    }
    schedule();
  }

  const onVisible = () => {
    if (document.visibilityState !== "visible") return;
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    void check();
  };

  document.addEventListener("visibilitychange", onVisible);
  void check();

  return () => {
    stopped = true;
    if (timer !== null) window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
