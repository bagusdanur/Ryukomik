"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { NotificationItem } from "@/types/content";
import {
  fetchCachedNotifications,
  markNotificationsRead,
  startNotificationPolling,
  subscribeNotifications,
} from "@/utils/notificationFetch";

export function useSharedNotifications(userId?: string | null) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeNotifications(userId, (nextItems, cursor) => {
      setItems(nextItems);
      setNextCursor(cursor);
    });
    const stopPolling = startNotificationPolling(userId);
    void fetchCachedNotifications(userId).finally(() => setLoading(false));
    return () => {
      unsubscribe();
      stopPolling();
    };
  }, [userId]);

  const unread = useMemo(() => items.filter((item) => !item.is_read).length, [items]);
  const refresh = useCallback(() => userId ? fetchCachedNotifications(userId, { force: true }) : Promise.resolve([]), [userId]);
  const markRead = useCallback((ids?: string[]) => userId ? markNotificationsRead(userId, ids) : Promise.resolve(), [userId]);
  return { items, unread, loading, nextCursor, refresh, markRead };
}
