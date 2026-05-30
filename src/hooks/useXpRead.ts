"use client";
import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";

interface UseXpReadArgs {
  user: User | null;
  slugStr: string;
}

interface XpQueueItem {
  user_id: string;
  chapter_slug: string;
  retryCount: number;
}

function readStringArray(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function readQueue(): XpQueueItem[] {
  try {
    const value = JSON.parse(localStorage.getItem("xp_queue") || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function useXpRead({ user, slugStr }: UseXpReadArgs) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!user?.id || !slugStr || hasTracked.current) return;

    // ✅ Cek localStorage: sudah dapat XP hari ini?
    const today = new Date().toISOString().split("T")[0];
    const trackedKey = `xp_tracked_${today}`;
    const tracked = readStringArray(trackedKey);

    if (tracked.includes(slugStr)) {
      hasTracked.current = true;
      return;
    }

    // ✅ Debounce 30 detik
    const timer = setTimeout(() => {
      const payload = { user_id: user.id, chapter_slug: slugStr };

      // ✅ Beacon API (tidak dihitung Edge Request)
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json",
        });
        const success = navigator.sendBeacon("/api/xp/read", blob);

        if (success) {
          tracked.push(slugStr);
          localStorage.setItem(trackedKey, JSON.stringify(tracked.slice(-50)));
          hasTracked.current = true;
          return;
        }
      }

      // Fallback fetch
      fetch("/api/xp/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      })
        .then(() => {
          tracked.push(slugStr);
          localStorage.setItem(trackedKey, JSON.stringify(tracked.slice(-50)));
          hasTracked.current = true;
        })
        .catch(() => {
          // Queue untuk retry
          const queue = readQueue();
          queue.push({ ...payload, retryCount: 0 });
          localStorage.setItem("xp_queue", JSON.stringify(queue.slice(-20)));
        });
    }, 30000);

    return () => clearTimeout(timer);
  }, [user?.id, slugStr]);
}

export function useXpQueueFlush() {
  useEffect(() => {
    const flush = async () => {
      const queue = readQueue();
      if (queue.length === 0) return;

      const failed: XpQueueItem[] = [];
      for (const item of queue) {
        try {
          const res = await fetch("/api/xp/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: item.user_id,
              chapter_slug: item.chapter_slug,
            }),
          });
          if (!res.ok) throw new Error("Failed");
        } catch {
          if (item.retryCount < 3) {
            failed.push({ ...item, retryCount: (item.retryCount || 0) + 1 });
          }
        }
      }

      if (failed.length === 0) {
        localStorage.removeItem("xp_queue");
      } else {
        localStorage.setItem("xp_queue", JSON.stringify(failed));
      }
    };

    const timer = setTimeout(flush, 10000);
    return () => clearTimeout(timer);
  }, []);
}
