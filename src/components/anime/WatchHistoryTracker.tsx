"use client";

import { useEffect } from "react";
import { useWatchHistoryStore, type WatchType } from "@/store/watchHistoryStore";

/**
 * Mencatat riwayat tonton setelah 12 detik — cukup untuk dianggap "menonton",
 * tapi tidak mencatat episode yang cuma diklik lalu ditinggal.
 * Render null: tidak menambah layout apa pun di halaman episode.
 */
export default function WatchHistoryTracker({
  type,
  seriesSlug,
  title,
  thumbnail,
  episodeSlug,
  episodeLabel,
}: {
  type: WatchType;
  seriesSlug?: string | null;
  title?: string | null;
  thumbnail?: string | null;
  episodeSlug: string;
  episodeLabel?: string | null;
}) {
  const addWatchHistory = useWatchHistoryStore((state) => state.addWatchHistory);

  useEffect(() => {
    if (!episodeSlug) return;
    const timer = setTimeout(() => {
      addWatchHistory({
        type,
        seriesSlug: seriesSlug || episodeSlug,
        title: title || episodeSlug.replace(/-/g, " "),
        thumbnail: thumbnail || null,
        episodeSlug,
        episodeLabel: episodeLabel || null,
      });
    }, 12_000);
    return () => clearTimeout(timer);
  }, [addWatchHistory, type, seriesSlug, title, thumbnail, episodeSlug, episodeLabel]);

  return null;
}
