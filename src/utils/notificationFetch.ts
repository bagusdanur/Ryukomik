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
    const eventNotif = await ensureTitleRushWeeklyNotification(userId);
    const { data } = await supabase
      .from("notifications")
      .select("id, user_id, actor_id, actor_name, type, slug, chapter, target_id, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    const notifications = eventNotif
      ? [eventNotif, ...((data || []) as NotificationItem[])]
      : ((data || []) as NotificationItem[]);

    notificationCache.set(userId, { at: Date.now(), data: notifications });
    notificationRequests.delete(userId);
    return notifications;
  })();

  notificationRequests.set(userId, request);
  return request;
}
