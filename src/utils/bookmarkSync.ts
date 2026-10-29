"use client";

import { supabase } from "@/lib/supabaseClient";

type LocalBookmark = {
  slug: string;
  title?: string;
  image?: string;
  source?: string;
};

function readLocalBookmarks(): LocalBookmark[] {
  try {
    const value = localStorage.getItem("bookmarks");
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Full-replace sync: hapus semua bookmark_sync lama → insert dari localStorage.
 * Hasilnya bookmark_sync = persis localStorage.
 */
export async function syncBookmarks(userId: string): Promise<boolean> {
  try {
    const bookmarks = readLocalBookmarks();

    // "source/slug" atau slug polos.
    const rows = bookmarks.map((bm) => {
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

    // Server yang melakukan full-replace (hapus + insert) di Postgres lokal.
    const { data } = await supabase.auth.getSession();
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
