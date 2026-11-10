"use client";

import { getSession } from "@/lib/auth/getSession";
import { useHistoryStore } from "@/store/historyStore";
import type { ReadHistoryItem } from "@/types/user";

type ServerHistoryRow = {
  comic_slug: string;
  last_chapter_slug: string | null;
  last_chapter: string | null;
  title: string | null;
  source: string | null;
  thumbnail: string | null;
  read_at: string;
};

async function authHeaders() {
  const { data } = await getSession();
  const token = data.session?.access_token;
  return token ? { "content-type": "application/json", authorization: `Bearer ${token}` } : null;
}

function toServerRows(items: ReadHistoryItem[]) {
  return items.map((item) => ({
    comic_slug: item.comicSlug,
    last_chapter_slug: item.lastChapterSlug || null,
    last_chapter: item.lastChapter || null,
    title: item.title || null,
    source: item.source || null,
    thumbnail: item.thumbnail || null,
    read_at: new Date(item.updatedAt).toISOString(),
  }));
}

function fromServerRows(rows: ServerHistoryRow[]): ReadHistoryItem[] {
  return rows
    .filter((row) => row.comic_slug)
    .map((row) => ({
      comicSlug: row.comic_slug,
      lastChapterSlug: row.last_chapter_slug || "",
      lastChapter: row.last_chapter || undefined,
      title: row.title || undefined,
      source: row.source || undefined,
      thumbnail: row.thumbnail || undefined,
      updatedAt: Date.parse(row.read_at) || Date.now(),
    }));
}

/**
 * Tarik riwayat server lalu merge per comicSlug (updatedAt terbaru menang).
 * Tanpa push — dipakai di awal syncHistory supaya item device lain tidak
 * tertimpa oleh full-replace.
 */
async function pullHistoryOnly(): Promise<boolean> {
  try {
    const headers = await authHeaders();
    if (!headers) return false;
    const res = await fetch("/api/history/sync", { headers, cache: "no-store" });
    if (!res.ok) return false;
    const json = (await res.json()) as { history?: ServerHistoryRow[] };
    const serverItems = fromServerRows(json.history || []);
    if (serverItems.length) {
      useHistoryStore.getState().mergeHistory(serverItems);
    }
    return true;
  } catch (err) {
    console.error("Gagal tarik riwayat:", err);
    return false;
  }
}

/**
 * Pull-then-push: tarik dulu (merge), baru push. Kalau pull gagal, tetap push
 * data lokal — server mungkin tersedia tapi GET gagal sesaat.
 */
export async function syncHistory(): Promise<boolean> {
  try {
    const headers = await authHeaders();
    if (!headers) return false;
    await pullHistoryOnly();
    const items = useHistoryStore.getState().history;
    const res = await fetch("/api/history/sync", {
      method: "POST",
      headers,
      body: JSON.stringify({ history: toServerRows(items) }),
    });
    if (res.status === 413) {
      // Batas tercapai: jangan buang data lokal, cukup beri tahu di console.
      // UI bisa menampilkan limit lewat GET /api/history/sync (field `limit`).
      const detail = (await res.json().catch(() => null)) as { limit?: number; isPremium?: boolean } | null;
      console.warn(
        `[historySync] batas riwayat tercapai (${detail?.limit ?? "?"}, premium=${detail?.isPremium ?? "?"})`,
      );
      return false;
    }
    return res.ok;
  } catch (err) {
    console.error("Gagal sync riwayat:", err);
    return false;
  }
}

/**
 * Dipakai saat login: tarik + merge + push. Implementasi sama dengan
 * syncHistory (yang sudah pull-then-push).
 */
export async function pullAndMergeHistory(): Promise<boolean> {
  return syncHistory();
}

const SYNC_DEBOUNCE_MS = 3000;
let pendingTimer: number | null = null;

export function scheduleHistorySync(): void {
  if (pendingTimer) window.clearTimeout(pendingTimer);
  pendingTimer = window.setTimeout(() => {
    pendingTimer = null;
    syncHistory().catch(console.error);
  }, SYNC_DEBOUNCE_MS);
}
