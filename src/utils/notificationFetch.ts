"use client";

import { supabase } from "@/lib/supabaseClient";
import type { NotificationItem } from "@/types/content";
import { ensureTitleRushWeeklyNotification } from "@/utils/titleRushNotification";

const NOTIFICATION_TTL = 60 * 1000;
const notificationCache = new Map<string, { at: number; data: NotificationItem[] }>();
const notificationRequests = new Map<string, Promise<NotificationItem[]>>();

export function clearNotificationCache(userId?: string | null) {
  if (!userId) return;
  notificationCache.delete(userId);
  notificationRequests.delete(userId);
}

export async function fetchCachedNotifications(
  userId?: string | null,
  options: { force?: boolean } = {},
) {
  if (!userId) return [];

  const cached = notificationCache.get(userId);
  if (!options.force && cached && Date.now() - cached.at < NOTIFICATION_TTL) {
    return cached.data;
  }

  const pending = notificationRequests.get(userId);
  if (!options.force && pending) return pending;

  const request = (async () => {
    try {
      const eventNotif = await ensureTitleRushWeeklyNotification(userId).catch((e) => {
        console.error("Title rush notif error:", e);
        return null;
      });

      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id, actor_id, actor_name, type, slug, chapter, target_id, is_read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const notifications = eventNotif
        ? [eventNotif, ...((data || []) as NotificationItem[])]
        : ((data || []) as NotificationItem[]);

      notificationCache.set(userId, { at: Date.now(), data: notifications });
      notificationRequests.delete(userId);
      return notifications;
    } catch (e) {
      console.error("fetchCachedNotifications error:", e);
      notificationRequests.delete(userId);
      return [];
    }
  })();

  notificationRequests.set(userId, request);
  return request;
}
