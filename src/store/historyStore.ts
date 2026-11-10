import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ReadHistoryItem } from "@/types/user";
import { getCurrentUserId } from "@/utils/currentUserId";
import { getProfile, isActivePremiumProfile } from "@/utils/profileCache";
import { FREE_HISTORY_LIMIT, historyLimitForPremium } from "@/lib/historyLimits";

interface HistoryState {
  history: ReadHistoryItem[];
  /** Penanda hapus: comicSlug -> waktu hapus. Mencegah item muncul lagi dari server. */
  deleted: Record<string, number>;
  /** Waktu "hapus semua" — item server yang lebih lama dari ini diabaikan. */
  deletedAllAt: number;
  addHistory: (item: ReadHistoryItem) => void;
  /** Merge hasil tarikan server: per comicSlug, updatedAt terbaru menang. */
  mergeHistory: (items: ReadHistoryItem[]) => void;
  removeHistory: (comicSlug: string) => void;
  clearHistory: () => void;
  /** Isi thumbnail untuk beberapa riwayat sekaligus (backfill, satu kali tulis). */
  updateHistoryThumbs: (entries: { comicSlug: string; thumbnail: string }[]) => void;
}

const MAX_HISTORY = FREE_HISTORY_LIMIT;

/**
 * Limit riwayat yang berlaku untuk user saat ini. Premium 2000, free 500.
 * Kalau profil belum ter-resolve (mis. saat pertama mount), pakai limit free
 * sebagai nilai konservatif — server tetap memakai limit yang benar.
 */
function currentHistoryLimit() {
  const userId = getCurrentUserId();
  const profile = userId ? getProfile(userId) : null;
  return historyLimitForPremium(isActivePremiumProfile(profile));
}

/** Judul chapter ("Chapter 1") bukan judul komik — jangan dipakai. */
function isBadTitle(title?: string | null) {
  if (!title) return true;
  const t = title.trim().toLowerCase();
  return /^(chapter|ch\.?)\s*[\d.]/.test(t) || t === "untitled";
}

function betterTitle(current?: string | null, incoming?: string | null) {
  if (isBadTitle(current)) return !isBadTitle(incoming) ? (incoming as string) : (current || incoming || "");
  if (!isBadTitle(incoming) && current && (incoming as string).length > (current as string).length * 1.5) {
    // Server punya judul jauh lebih lengkap (mis. slug → judul asli).
    return incoming as string;
  }
  return current as string;
}

/** Hapus riwayat di server supaya tidak muncul lagi saat sinkron/refresh. */
async function deleteRemoteHistory(comicSlug?: string) {
  if (typeof window === "undefined") return;
  try {
    const { getSession } = await import("@/lib/auth/getSession");
    const { data } = await getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/history/sync", {
      method: "DELETE",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(comicSlug ? { comic_slug: comicSlug } : { all: true }),
    });
  } catch {
    // offline: tombstone lokal tetap mencegah item muncul kembali
  }
}

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
      deleted: {},
      deletedAllAt: 0,
      addHistory: (item) =>
        set((state) => {
          // Hapus history lama jika comicSlug sama, lalu taruh di depan
          const filtered = state.history.filter(
            (h) => h.comicSlug !== item.comicSlug
          );
          filtered.unshift(item);
          const deleted = { ...state.deleted };
          delete deleted[item.comicSlug];
          return { history: filtered.slice(0, currentHistoryLimit()), deleted };
        }),
      mergeHistory: (items) =>
        set((state) => {
          const map = new Map<string, ReadHistoryItem>();
          for (const item of state.history) map.set(item.comicSlug, item);

          // Buang tombstone yang sudah tidak ada di server (hapus berhasil).
          const serverSlugs = new Set(items.map((i) => i.comicSlug));
          const deleted: Record<string, number> = {};
          for (const [slug, at] of Object.entries(state.deleted)) {
            if (serverSlugs.has(slug)) deleted[slug] = at;
          }

          for (const item of items) {
            if (deleted[item.comicSlug]) continue;
            if (state.deletedAllAt && item.updatedAt <= state.deletedAllAt) continue;
            const existing = map.get(item.comicSlug);
            if (!existing || item.updatedAt > existing.updatedAt) {
              // Thumbnail lokal dipertahankan kalau versi server tidak punya.
              map.set(item.comicSlug, {
                ...item,
                thumbnail: item.thumbnail || existing?.thumbnail,
                title: betterTitle(existing?.title, item.title),
              });
            } else if (existing) {
              // Judul lokal rusak ("Chapter 1") tetap diganti judul server yang benar.
              let healed = betterTitle(existing.title, item.title);
              // Judul project di server = judul seri asli dari database; lokal bisa
              // berisi tebakan dari slug ("Ryuscanlation Inma ..."), jadi server menang.
              if (item.source === "project" && item.title && item.title.trim() && item.title !== existing.title) {
                healed = item.title;
              }
              if (healed !== existing.title) map.set(item.comicSlug, { ...existing, title: healed });
            }
          }
          const merged = [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt);
          return { history: merged.slice(0, currentHistoryLimit()), deleted };
        }),
      removeHistory: (comicSlug) => {
        set((state) => ({
          history: state.history.filter((h) => h.comicSlug !== comicSlug),
          deleted: { ...state.deleted, [comicSlug]: Date.now() },
        }));
        void deleteRemoteHistory(comicSlug);
      },
      clearHistory: () => {
        set({ history: [], deleted: {}, deletedAllAt: Date.now() });
        void deleteRemoteHistory();
      },
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
