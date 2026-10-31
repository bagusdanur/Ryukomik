"use client";

import { useEffect, useRef } from "react";
import { useHistoryStore } from "@/store/historyStore";
import type { ReadHistoryItem } from "@/types/user";

/**
 * Backfill thumbnail riwayat baca yang belum punya cover.
 *
 * Dibatasi per pemanggilan supaya halaman riwayat (bisa ratusan baris) tidak
 * memicu ratusan request sekaligus. Setiap series hanya dicoba sekali per sesi,
 * hasilnya disimpan ke localStorage lewat updateHistoryThumbs.
 */
export default function useHistoryThumbBackfill(items: ReadHistoryItem[], limit = 12) {
  const updateThumbs = useHistoryStore((state) => state.updateHistoryThumbs);
  const attempted = useRef<Set<string>>(new Set());

  useEffect(() => {
    const missing = items.filter((item) => {
      if (!item.comicSlug || item.thumbnail) return false;
      const source = item.source || "komiku";
      if (source === "project") return false;
      const key = `${source}|${item.comicSlug}`;
      if (attempted.current.has(key)) return false;
      attempted.current.add(key);
      return true;
    });
    if (!missing.length) return;

    let cancelled = false;
    (async () => {
      const found: { comicSlug: string; thumbnail: string }[] = [];
      for (const item of missing.slice(0, limit)) {
        try {
          const res = await fetch(
            `/api/series-thumb?source=${encodeURIComponent(item.source || "komiku")}&slug=${encodeURIComponent(item.comicSlug)}`,
          );
          if (!res.ok) continue;
          const json = (await res.json()) as { thumbnail?: string | null };
          if (json.thumbnail) found.push({ comicSlug: item.comicSlug, thumbnail: json.thumbnail });
        } catch {
          // biarkan placeholder tampil; tidak perlu mengulang terus
        }
      }
      if (!cancelled && found.length) updateThumbs(found);
    })();

    return () => {
      cancelled = true;
    };
  }, [items, limit, updateThumbs]);
}
