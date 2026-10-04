"use client";

import { supabase } from "@/lib/supabaseClient";
import { refreshProfile } from "@/utils/profileCache";

const PENDING_KEY = "rk-premium-pending";
const POLL_MS = 60_000;
type PendingMarker = { userId: string; requestId?: string; at: number };
type PremiumStatus = { id: string; status: "pending" | "approved" | "rejected"; updated_at: string | null };

let refs = 0;
let activeUserId: string | null = null;
let timer: number | null = null;
let checking: Promise<void> | null = null;
let messageHandler: ((event: MessageEvent) => void) | null = null;
let visibilityHandler: (() => void) | null = null;

function readMarker(): PendingMarker | null {
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_KEY) || "null") as PendingMarker | null;
    return value?.userId ? value : null;
  } catch { return null; }
}

export function markPremiumRequestPending(userId: string, requestId?: string) {
  localStorage.setItem(PENDING_KEY, JSON.stringify({ userId, requestId, at: Date.now() }));
  if (activeUserId === userId) schedule(0);
}

export function clearPremiumRequestPending(userId?: string) {
  const marker = readMarker();
  if (!userId || marker?.userId === userId) localStorage.removeItem(PENDING_KEY);
  if (timer !== null) window.clearTimeout(timer);
  timer = null;
}

async function checkStatus() {
  if (checking || !activeUserId) return checking;
  const userId = activeUserId;
  if (readMarker()?.userId !== userId) return;
  checking = (async () => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) return;
    const response = await fetch("/api/premium/status", {
      cache: "no-store",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return schedule(POLL_MS);
    const payload = await response.json() as { request: PremiumStatus | null };
    if (!payload.request || payload.request.status === "pending") return schedule(POLL_MS);
    clearPremiumRequestPending(userId);
    if (payload.request.status === "approved") await refreshProfile(userId);
  })().catch((error) => {
    console.warn("Premium status check failed:", error);
    schedule(POLL_MS);
  }).finally(() => { checking = null; });
  return checking;
}

function schedule(delay = POLL_MS) {
  if (!activeUserId || readMarker()?.userId !== activeUserId) return;
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(() => void checkStatus(), delay);
}

export function startPremiumStatusSync(userId: string) {
  refs += 1;
  activeUserId = userId;
  if (refs === 1) {
    messageHandler = (event) => {
      if (event.data?.type !== "premium_activated" || !activeUserId) return;
      const id = activeUserId;
      clearPremiumRequestPending(id);
      void refreshProfile(id);
    };
    navigator.serviceWorker?.addEventListener("message", messageHandler);
    visibilityHandler = () => {
      if (document.visibilityState === "visible" && readMarker()?.userId === activeUserId) schedule(0);
    };
    document.addEventListener("visibilitychange", visibilityHandler);
  }
  if (readMarker()?.userId === userId) schedule(0);
  return () => {
    refs = Math.max(0, refs - 1);
    if (refs) return;
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    if (messageHandler) navigator.serviceWorker?.removeEventListener("message", messageHandler);
    if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
    messageHandler = null;
    visibilityHandler = null;
    activeUserId = null;
  };
}
