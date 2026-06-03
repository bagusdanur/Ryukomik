import type { NotificationItem } from "@/types/content";

export const TITLE_RUSH_EVENT_TYPE = "title_rush_event";
const TITLE_RUSH_NOTIFICATION_VERSION = "2026-05-24-2";
const TITLE_RUSH_STATUS_CACHE_KEY = "rk-title-rush-status-cache";
const TITLE_RUSH_STATUS_CACHE_MS = 5 * 60 * 1000;

let statusMemoryCache: { at: number; enabled: boolean } | null = null;
let statusRequest: Promise<boolean> | null = null;

function getCurrentWeekStart() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const jakarta = new Date(utc + 7 * 60 * 60000);
  const day = jakarta.getDay() || 7;
  jakarta.setDate(jakarta.getDate() - day + 1);
  jakarta.setHours(0, 0, 0, 0);
  return jakarta.toISOString().slice(0, 10);
}

export async function ensureTitleRushWeeklyNotification(userId?: string | null) {
  if (!userId || typeof window === "undefined") return null;

  const eventEnabled = await loadTitleRushStatus();
  if (!eventEnabled) return null;

  const weekStart = getCurrentWeekStart();
  const localKey = `rk-title-rush-weekly-notif:${TITLE_RUSH_NOTIFICATION_VERSION}:${userId}:${weekStart}`;
  const isRead = localStorage.getItem(localKey) === "1";

  return {
    id: `title-rush-event-${TITLE_RUSH_NOTIFICATION_VERSION}-${weekStart}`,
    user_id: userId,
    actor_name: "Ryukomik Title Rush",
    type: TITLE_RUSH_EVENT_TYPE,
    slug: weekStart,
    target_id: "weekly",
    is_read: isRead,
    created_at: new Date().toISOString(),
  } satisfies NotificationItem;
}

async function loadTitleRushStatus() {
  if (statusMemoryCache && Date.now() - statusMemoryCache.at < TITLE_RUSH_STATUS_CACHE_MS) {
    return statusMemoryCache.enabled;
  }

  try {
    const raw = sessionStorage.getItem(TITLE_RUSH_STATUS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { at?: number; enabled?: boolean };
      if (
        typeof parsed.enabled === "boolean" &&
        parsed.at &&
        Date.now() - parsed.at < TITLE_RUSH_STATUS_CACHE_MS
      ) {
        statusMemoryCache = { at: parsed.at, enabled: parsed.enabled };
        return parsed.enabled;
      }
    }
  } catch {
    // Ignore cache parsing issues and refetch below.
  }

  if (statusRequest) return statusRequest;

  statusRequest = fetch("/api/game/title-rush/status")
    .then(async (res) => {
      if (!res.ok) return true;
      const json = await res.json().catch(() => null);
      return json?.enabled !== false;
    })
    .then((enabled) => {
      const entry = { at: Date.now(), enabled };
      statusMemoryCache = entry;
      try {
        sessionStorage.setItem(TITLE_RUSH_STATUS_CACHE_KEY, JSON.stringify(entry));
      } catch {
        // Session storage is a best-effort cache.
      }
      statusRequest = null;
      return enabled;
    })
    .catch(() => {
      statusRequest = null;
      return true;
    });

  return statusRequest;
}

export function markTitleRushWeeklyNotificationRead(userId?: string | null, weekStart?: string | null) {
  if (!userId || !weekStart || typeof window === "undefined") return;
  localStorage.setItem(
    `rk-title-rush-weekly-notif:${TITLE_RUSH_NOTIFICATION_VERSION}:${userId}:${weekStart}`,
    "1",
  );
}
