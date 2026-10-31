import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WatchType = "anime" | "donghua";

export type WatchHistoryItem = {
  /** Kunci unik: seriesSlug kalau ada, kalau tidak episodeSlug. */
  key: string;
  seriesSlug: string;
  title: string;
  thumbnail?: string | null;
  episodeSlug: string;
  episodeLabel?: string | null;
  type: WatchType;
  updatedAt: number;
};

interface WatchHistoryState {
  history: WatchHistoryItem[];
  addWatchHistory: (item: Omit<WatchHistoryItem, "key" | "updatedAt">) => void;
  removeWatchHistory: (key: string) => void;
  clearWatchHistory: () => void;
}

const MAX_ITEMS = 200;

export const useWatchHistoryStore = create<WatchHistoryState>()(
  persist(
    (set) => ({
      history: [],
      addWatchHistory: (item) =>
        set((state) => {
          const key = item.seriesSlug || item.episodeSlug;
          // Episode terbaru menimpa entri seri yang sama supaya daftar tetap
          // satu baris per seri, bukan satu baris per episode.
          const rest = state.history.filter((entry) => entry.key !== key);
          return {
            history: [{ ...item, key, updatedAt: Date.now() }, ...rest].slice(0, MAX_ITEMS),
          };
        }),
      removeWatchHistory: (key) =>
        set((state) => ({ history: state.history.filter((entry) => entry.key !== key) })),
      clearWatchHistory: () => set({ history: [] }),
    }),
    { name: "rk_watch_history", version: 1 },
  ),
);
