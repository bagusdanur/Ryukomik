import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ReadHistoryItem } from "@/types/user";

interface HistoryState {
  history: ReadHistoryItem[];
  addHistory: (item: ReadHistoryItem) => void;
  removeHistory: (comicSlug: string) => void;
  clearHistory: () => void;
  /** Isi thumbnail untuk beberapa riwayat sekaligus (backfill, satu kali tulis). */
  updateHistoryThumbs: (entries: { comicSlug: string; thumbnail: string }[]) => void;
}

const MAX_HISTORY = 200;

// 🔥 MIGRATION SCRIPT UNTUK PENGGUNA LAMA
if (typeof window !== "undefined") {
  try {
    const oldRaw = localStorage.getItem("read_history");
    if (oldRaw) {
      const parsed = JSON.parse(oldRaw);
      // Jika bentuknya Array, berarti ini history versi lama (sebelum Zustand)
      // Dan belum tertimpa oleh Zustand.
      if (Array.isArray(parsed)) {
        // Konversi ke format Zustand persist
        localStorage.setItem(
          "rk_history_zustand",
          JSON.stringify({
            state: { history: parsed.slice(0, MAX_HISTORY) },
            version: 0,
          })
        );
        // Hapus key lama agar tidak dijalankan ulang (atau biarkan sebagai backup)
        localStorage.removeItem("read_history");
      }
    }
  } catch (e) {
    console.error("Gagal migrasi history lama:", e);
  }
}

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
      updateHistoryThumbs: (entries) =>
        set((state) => {
          if (!entries.length) return state;
          const map = new Map(entries.map((e) => [e.comicSlug, e.thumbnail]));
          let changed = false;
          const history = state.history.map((h) => {
            const thumb = map.get(h.comicSlug);
            if (!thumb || thumb === h.thumbnail) return h;
            changed = true;
            return { ...h, thumbnail: thumb };
          });
          return changed ? { history } : state;
        }),
    }),
    {
      name: "rk_history_zustand", // Nama key baru agar tidak tabrakan
    }
  )
);
