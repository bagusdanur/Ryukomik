import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ReadHistoryItem } from "@/types/user";

interface HistoryState {
  history: ReadHistoryItem[];
  addHistory: (item: ReadHistoryItem) => void;
  removeHistory: (comicSlug: string) => void;
  clearHistory: () => void;
}

const MAX_HISTORY = 200;

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      history: [],
      addHistory: (item) =>
        set((state) => {
          // Hapus history lama jika comicSlug sama, lalu taruh di depan
          const filtered = state.history.filter(
            (h) => h.comicSlug !== item.comicSlug
          );
          filtered.unshift(item);
          return { history: filtered.slice(0, MAX_HISTORY) };
        }),
      removeHistory: (comicSlug) =>
        set((state) => ({
          history: state.history.filter((h) => h.comicSlug !== comicSlug),
        })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: "read_history", // Sesuai dengan key localStorage lama
    }
  )
);
