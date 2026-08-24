"use client";

import { socialFetch } from "@/lib/social/client";
import type { NotificationItem } from "@/types/content";
import { ensureTitleRushWeeklyNotification } from "@/utils/titleRushNotification";

// Visibility changes also trigger a refresh. Slow background polling avoids
// multiplying Auth and database egress for every open tab.
const NOTIFICATION_TTL = 60 * 1000;
const POLL_INTERVAL = 15 * 60 * 1000;
type Listener = (items: NotificationItem[], nextCursor: string | null) => void;
type Poller = { refs: number; timer: number; onVisibility: () => void };
const notificationCache = new Map<string, { at: number; data: NotificationItem[] }>();
const notificationRequests = new Map<string, Promise<NotificationItem[]>>();
const notificationListeners = new Map<string, Set<Listener>>();
const notificationPollers = new Map<string, Poller>();
const notificationCursors = new Map<string, string | null>();

function publish(userId: string, data: NotificationItem[], nextCursor = notificationCursors.get(userId) || null) {
  notificationCache.set(userId, { at: Date.now(), data });
  notificationCursors.set(userId, nextCursor);
  notificationListeners.get(userId)?.forEach((listener) => listener(data, nextCursor));
}

export function subscribeNotifications(userId: string, listener: Listener) {
  let listeners = notificationListeners.get(userId);
  if (!listeners) {
    listeners = new Set();
    notificationListeners.set(userId, listeners);
  }
  listeners.add(listener);
  const cached = notificationCache.get(userId);
  if (cached) listener(cached.data, notificationCursors.get(userId) || null);
  return () => {
    listeners?.delete(listener);
    if (!listeners?.size) notificationListeners.delete(userId);
  };
}

export function clearNotificationCache(userId?: string | null) {
  if (!userId) return;
  notificationCache.delete(userId);
}

export async function fetchCachedNotifications(
  userId?: string | null,
  options: { force?: boolean } = {},
) {
  if (!userId) return [];

  const pending = notificationRequests.get(userId);
  if (pending) return pending;
  const cached = notificationCache.get(userId);
  if (!options.force && cached && Date.now() - cached.at < NOTIFICATION_TTL) {
    return cached.data;
  }

  const request = (async () => {
    try {
      const [eventNotif, result] = await Promise.all([
        ensureTitleRushWeeklyNotification(userId).catch(() => null),
        socialFetch<{ items: NotificationItem[]; nextCursor?: string | null }>("/api/social/notifications"),
      ]);
      const notifications = eventNotif ? [eventNotif, ...result.items] : result.items;
      publish(userId, notifications, result.nextCursor || null);
      return notifications;
    } catch (e) {
      console.error("fetchCachedNotifications error:", e);
      return notificationCache.get(userId)?.data || [];
    } finally {
      notificationRequests.delete(userId);
    }
  })();

  notificationRequests.set(userId, request);
  return request;
}

export function startNotificationPolling(userId: string) {
  const current = notificationPollers.get(userId);
  if (current) {
    current.refs += 1;
    return () => stopNotificationPolling(userId);
  }
  const refresh = () => {
    if (document.visibilityState === "visible") void fetchCachedNotifications(userId);
  };
  const onVisibility = () => refresh();
  const timer = window.setInterval(refresh, POLL_INTERVAL);
  document.addEventListener("visibilitychange", onVisibility);
  notificationPollers.set(userId, { refs: 1, timer, onVisibility });
  refresh();
  return () => stopNotificationPolling(userId);
}

function stopNotificationPolling(userId: string) {
  const poller = notificationPollers.get(userId);
  if (!poller) return;
  poller.refs -= 1;
  if (poller.refs > 0) return;
  window.clearInterval(poller.timer);
  document.removeEventListener("visibilitychange", poller.onVisibility);
  notificationPollers.delete(userId);
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  const previous = notificationCache.get(userId)?.data || [];
  const selected = ids?.length ? new Set(ids) : null;
  publish(userId, previous.map((item) =>
    (!selected || selected.has(item.id)) ? { ...item, is_read: true } : item,
  ));
  try {
    await socialFetch("/api/social/notifications", {
      method: "PATCH",
      body: JSON.stringify(ids?.length ? { ids: ids.slice(0, 50) } : { all: true }),
    });
  } catch (error) {
    publish(userId, previous);
    throw error;
  }
}
