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

    // 1. Hapus semua bookmark_sync milik user ini
    const { error: deleteError } = await supabase
      .from("bookmark_sync")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Gagal hapus bookmark_sync:", deleteError);
      return false;
    }

    // 2. Jika bookmark kosong, selesai (sudah dihapus semua)
    if (bookmarks.length === 0) return true;

    // 3. Insert semua bookmark dari localStorage
    const rows = bookmarks.map((bm) => {
      // Extract slug: bisa format "source/slug" atau plain "slug"
      const parts = bm.slug.split("/");
      const source = parts.length > 1 ? parts[0] : bm.source || "komiku";
      const comicSlug = parts.length > 1 ? parts.slice(1).join("/") : bm.slug;

      return {
        user_id: userId,
        comic_slug: comicSlug,
        source,
        title: bm.title || null,
        image: bm.image || null,
      };
    });

    const { error: insertError } = await supabase
      .from("bookmark_sync")
      .upsert(rows, { onConflict: "user_id,comic_slug" });

    if (insertError) {
      console.error("Gagal insert bookmark_sync:", insertError);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Gagal sync bookmarks:", err);
    return false;
  }
}
