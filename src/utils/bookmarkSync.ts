"use client";

import { supabase } from "@/lib/supabaseClient";
import { getSession } from "@/lib/auth/getSession";

type LocalBookmark = {
  slug: string;
  title?: string;
  image?: string;
  source?: string;
};

type ServerBookmark = {
  comic_slug: string;
  source: string;
  title: string | null;
  image?: string | null;
};

const BOOKMARKS_KEY = "bookmarks";
const TOMBSTONE_KEY = "bookmark_deleted";
const DELETED_ALL_KEY = "bookmark_deleted_all_at";

function bookmarkKey(item: { slug: string; source?: string }): string {
  return `${item.source || "komiku"}|${item.slug}`;
}

function readLocalBookmarks(): LocalBookmark[] {
  try {
    const value = localStorage.getItem(BOOKMARKS_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalBookmarks(items: LocalBookmark[]): void {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("bookmark-updated"));
  } catch {
    // localStorage penuh / tidak tersedia — data di memori tetap dipakai.
  }
}

/** Penanda hapus per bookmark: "source|slug" -> waktu hapus. */
function readTombstones(): Record<string, number> {
  try {
    const value = localStorage.getItem(TOMBSTONE_KEY);
    const parsed = value ? JSON.parse(value) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeTombstones(value: Record<string, number>): void {
  try {
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(value));
  } catch {
    // abaikan
  }
}

function readDeletedAllAt(): number {
  try {
    return Number(localStorage.getItem(DELETED_ALL_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

function writeDeletedAllAt(value: number): void {
  try {
    if (value) localStorage.setItem(DELETED_ALL_KEY, String(value));
    else localStorage.removeItem(DELETED_ALL_KEY);
  } catch {
    // abaikan
  }
}

function fromServerBookmarks(rows: ServerBookmark[]): LocalBookmark[] {
  return rows
    .filter((row) => row && typeof row.comic_slug === "string" && row.comic_slug)
    .map((row) => ({
      slug: row.comic_slug,
      title: row.title || undefined,
      image: row.image || undefined,
      source: row.source || "komiku",
    }));
}

/**
 * Tarik bookmark dari server lalu gabung dengan lokal (union per source+slug).
 * Item yang ada di tombstone dihapus, jadi hapus bookmark tidak "balik" dari
 * server. Dipakai saat login / masuk halaman bookmark.
 */
export async function pullAndMergeBookmarks(userId: string): Promise<boolean> {
  try {
    const { data } = await getSession();
    const token = data.session?.access_token;
    if (!token) return false;

    const res = await fetch("/api/bookmarks/sync", {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { bookmarks?: ServerBookmark[] };
    const serverItems = fromServerBookmarks(json.bookmarks || []);

    const tombstones = readTombstones();
    const deletedAllAt = readDeletedAllAt();
    const serverFiltered = serverItems.filter((item) => {
      const key = bookmarkKey(item);
      if (tombstones[key]) return false;
      if (deletedAllAt) {
        // Server tidak punya timestamp per item; deletedAllAt menandai "hapus
        // semua" — item server diabaikan sampai ada penambahan lokal baru.
        return false;
      }
      return true;
    });

    const map = new Map<string, LocalBookmark>();
    // Item lokal menang (karena source judul/gambar terbaru di perangkat ini).
    for (const item of readLocalBookmarks()) map.set(bookmarkKey(item), item);
    for (const item of serverFiltered) {
      const key = bookmarkKey(item);
      if (!map.has(key)) map.set(key, item);
    }

    const merged = [...map.values()];
    writeLocalBookmarks(merged);

    // Pull menghapus kebutuhan tombstone "hapus semua" lama.
    if (deletedAllAt) writeDeletedAllAt(0);
    return true;
  } catch {
    return false;
  }
}

function toServerRows(items: LocalBookmark[]) {
  return items.map((bm) => {
    const parts = bm.slug.split("/");
    const source = parts.length > 1 ? parts[0] : bm.source || "komiku";
    const comicSlug = parts.length > 1 ? parts.slice(1).join("/") : bm.slug;
    return {
      comic_slug: comicSlug,
      source,
      title: bm.title || null,
      image: bm.image || null,
    };
  });
}

/**
 * Push bookmark lokal ke server (full-replace di server). Panggil
 * pullAndMergeBookmarks dulu supaya item device lain tidak tertimpa.
 */
export async function syncBookmarks(userId: string): Promise<boolean> {
  try {
    // Pull dulu supaya item device lain ada di lokal sebelum push — kalau
    // tidak, full-replace akan menimpa server dengan daftar tidak lengkap.
    await pullAndMergeBookmarks(userId);
    const bookmarks = readLocalBookmarks();
    const rows = toServerRows(bookmarks);

    const { data } = await getSession();
    const token = data.session?.access_token;
    if (!token) return false;

    const res = await fetch("/api/bookmarks/sync", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ bookmarks: rows }),
    });

    if (!res.ok) {
      console.error("Gagal sync bookmark:", await res.text().catch(() => res.status));
      return false;
    }
    return true;
  } catch (err) {
    console.error("Gagal sync bookmarks:", err);
    return false;
  }
}

/** Hapus satu bookmark: catat tombstone (supaya tidak balik dari server). */
export function removeBookmarkLocal(slug: string, source?: string): LocalBookmark[] {
  const key = `${source || "komiku"}|${slug}`;
  const tombstones = readTombstones();
  tombstones[key] = Date.now();
  writeTombstones(tombstones);
  writeDeletedAllAt(0);

  const remaining = readLocalBookmarks().filter((item) => bookmarkKey(item) !== key);
  writeLocalBookmarks(remaining);
  return remaining;
}

/** Hapus semua bookmark: tombstone "hapus semua". */
export function clearBookmarksLocal(): void {
  writeDeletedAllAt(Date.now());
  writeTombstones({});
  writeLocalBookmarks([]);
}

/** Pull-then-push: aman dipanggil berkala (login, focus). */
export async function syncBookmarksSafe(userId: string): Promise<boolean> {
  const pulled = await pullAndMergeBookmarks(userId);
  return syncBookmarks(userId) || pulled;
}

// Coalesce bursts of triggers (mount + "bookmark-updated" + restore) into one
// full-replace sync. syncBookmarks is a delete+upsert of the whole set, so
// running it several times within a second wastes two Supabase writes per call
// with identical results. The debounce collapses a burst to a single run.
const SYNC_DEBOUNCE_MS = 2000;
const pendingSyncs = new Map<string, number>();

export function scheduleBookmarkSync(userId: string): void {
  const existing = pendingSyncs.get(userId);
  if (existing) window.clearTimeout(existing);
  const handle = window.setTimeout(() => {
    pendingSyncs.delete(userId);
    syncBookmarks(userId).catch(console.error);
  }, SYNC_DEBOUNCE_MS);
  pendingSyncs.set(userId, handle);
}
