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

// A single read must be recorded at most once per (user, chapter) per session.
// localStorage alone is not enough: it is only written after the request
// resolves, so two fast mounts (or a remount on navigation) can both fire before
// either write lands. This in-memory set blocks the duplicate the moment the
// first send starts. Next.js re-renders ChapterClient on slug change without
// remounting, so a single boolean ref would leak across chapters — a set keyed
// per chapter is required for both correctness and dedup.
const sentReads = new Set<string>();

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

function markTracked(userId: string, chapterSlug: string) {
  sentReads.add(`${userId}:${chapterSlug}`);
  try {
    const today = new Date().toISOString().split("T")[0];
    const trackedKey = `xp_tracked_${today}`;
    const tracked = readStringArray(trackedKey);
    if (!tracked.includes(chapterSlug)) {
      tracked.push(chapterSlug);
      localStorage.setItem(trackedKey, JSON.stringify(tracked.slice(-200)));
    }
  } catch {
    // localStorage unavailable — the in-memory set still prevents duplicates.
  }
}

function alreadyTracked(userId: string, chapterSlug: string): boolean {
  if (sentReads.has(`${userId}:${chapterSlug}`)) return true;
  const today = new Date().toISOString().split("T")[0];
  return readStringArray(`xp_tracked_${today}`).includes(chapterSlug);
}

export function useXpRead({ user, slugStr }: UseXpReadArgs) {
  const userId = user?.id;

  useEffect(() => {
    if (!userId || !slugStr) return;
    if (alreadyTracked(userId, slugStr)) return;

    // Debounce 30 detik supaya scroll/redirect cepat tidak memicu request.
    const timer = setTimeout(() => {
      if (alreadyTracked(userId, slugStr)) return;

      const payload = { user_id: userId, chapter_slug: slugStr };

      // ✅ Beacon API (tidak dihitung Edge Request)
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json",
        });
        const success = navigator.sendBeacon("/api/xp/read", blob);

        if (success) {
          markTracked(userId, slugStr);
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
          markTracked(userId, slugStr);
        })
        .catch(() => {
          // Queue untuk retry
          const queue = readQueue();
          if (!queue.some((item) => item.user_id === userId && item.chapter_slug === slugStr)) {
            queue.push({ ...payload, retryCount: 0 });
            localStorage.setItem("xp_queue", JSON.stringify(queue.slice(-20)));
          }
        });
    }, 30000);

    return () => clearTimeout(timer);
  }, [userId, slugStr]);
}

export function useXpQueueFlush() {
  useEffect(() => {
    const flush = async () => {
      const queue = readQueue();
      if (queue.length === 0) return;
      const failed: XpQueueItem[] = [];
      for (const item of queue) {
        // Skip anything already recorded this session to avoid a second RPC.
        if (alreadyTracked(item.user_id, item.chapter_slug)) continue;
        try {
          const res = await fetch("/api/xp/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: item.user_id,
              chapter_slug: item.chapter_slug,
            }),
          });
          if (!res.ok && res.status < 500) {
            // 4xx = payload permanen tidak valid; retry tidak akan membantu.
            markTracked(item.user_id, item.chapter_slug);
            continue;
          }
          if (!res.ok) throw new Error("Failed");
          markTracked(item.user_id, item.chapter_slug);
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
