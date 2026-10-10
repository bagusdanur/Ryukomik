"use client";

import { refreshProfile } from "@/utils/profileCache";

// Returning to a backgrounded tab/app is the cheapest moment to pick up a
// premium approval: one profile read per foreground return, throttled so rapid
// app-switching cannot spam Supabase.
export const MIN_VISIBLE_REFRESH_MS = 30_000;

export function shouldRefreshProfile(lastAt: number, now: number) {
  if (!lastAt) return true;
  return now - lastAt >= MIN_VISIBLE_REFRESH_MS;
}

type Cleanup = () => void;

let refs = 0;
let activeUserId: string | null = null;
let lastRefreshAt = 0;
let onVisible: (() => void) | null = null;

function refresh(userId: string, force = false) {
  const now = Date.now();
  if (!force && !shouldRefreshProfile(lastRefreshAt, now)) return;
  lastRefreshAt = now;
  void refreshProfile(userId);
}

// Ref-counted so Navbar + Settings + reader can all ask for the same behaviour
// without stacking duplicate listeners. The profile cache is global, so one
// refresh notifies every subscriber.
export function startProfileVisibilityRefresh(userId: string): Cleanup {
  refs += 1;
  activeUserId = userId;

  if (refs === 1) {
    onVisible = () => {
      if (document.visibilityState === "visible" && activeUserId) refresh(activeUserId);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
  }

  // If the app is already in the foreground when this mounts, refresh once now
  // so a fresh page load always reflects the latest premium state.
  if (document.visibilityState === "visible") refresh(userId, true);

  return () => {
    refs = Math.max(0, refs - 1);
    if (refs) return;
    if (onVisible) {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    }
    onVisible = null;
    activeUserId = null;
  };
}
