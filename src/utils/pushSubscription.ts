"use client";

import { supabase } from "@/lib/supabaseClient";

/** Subscription push disimpan di Postgres lokal lewat API kita (bukan Supabase). */
async function pushApi(method: "POST" | "DELETE", body: Record<string, unknown>) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, error: "Login diperlukan." };
  const res = await fetch("/api/push/subscriptions", {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: res.ok, error: json?.error };
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribePush(userId: string): Promise<boolean> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const registration = await navigator.serviceWorker.ready;

    // Unsubscribe existing jika ada
    const existing = await registration.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as any,
    });

    const json = subscription.toJSON();
    const keys = json.keys || {};

    const saved = await pushApi("POST", {
      endpoint: json.endpoint!,
      p256dh: keys.p256dh || "",
      auth: keys.auth || "",
    });

    if (!saved.ok) {
      console.error("Gagal simpan push subscription:", saved.error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Gagal subscribe push:", err);
    return false;
  }
}

export async function unsubscribePush(userId: string): Promise<boolean> {
  try {
    const subscription = await getExistingSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      await pushApi("DELETE", { endpoint });
    }
    return true;
  } catch (err) {
    console.error("Gagal unsubscribe push:", err);
    return false;
  }
}
