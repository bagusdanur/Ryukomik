import type { NotificationItem } from "@/types/content";

export const TITLE_RUSH_EVENT_TYPE = "title_rush_event";
const TITLE_RUSH_NOTIFICATION_VERSION = "2026-05-24-2";

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

  const statusRes = await fetch("/api/game/title-rush/status", {
    cache: "no-store",
  }).catch(() => null);
  const statusJson = statusRes?.ok ? await statusRes.json().catch(() => null) : null;

  if (statusJson?.enabled === false) return null;

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

export function markTitleRushWeeklyNotificationRead(userId?: string | null, weekStart?: string | null) {
  if (!userId || !weekStart || typeof window === "undefined") return;
  localStorage.setItem(
    `rk-title-rush-weekly-notif:${TITLE_RUSH_NOTIFICATION_VERSION}:${userId}:${weekStart}`,
    "1",
  );
}
