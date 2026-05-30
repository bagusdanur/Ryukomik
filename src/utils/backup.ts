import { supabase } from "@/lib/supabaseClient";

type BackupPayload = unknown[];

function readArrayFromStorage(key: string): BackupPayload {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/* ================= CREATE BACKUP ================= */
export async function createBackup(userId?: string | null): Promise<boolean> {
  if (!userId) return false;

  try {
    let history = readArrayFromStorage("read_history");
    let bookmarks = readArrayFromStorage("bookmarks");

    // 🔥 Batasi biar tidak over besar
    history = Array.isArray(history) ? history.slice(0, 300) : [];
    bookmarks = Array.isArray(bookmarks) ? bookmarks : [];

    const { error } = await supabase
      .from("user_backup")
      .upsert(
        {
          user_id: userId,
          history,
          bookmarks,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) throw error;

    return true;
  } catch (err) {
    console.error("Backup gagal:", err);
    return false;
  }
}


/* ================= RESTORE BACKUP ================= */
export async function restoreBackup(userId?: string | null): Promise<boolean> {
  if (!userId) return false;

  try {
    const { data, error } = await supabase
      .from("user_backup")
      .select("history, bookmarks")
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    if (!data) return false;

    localStorage.setItem(
      "read_history",
      JSON.stringify(Array.isArray(data.history) ? data.history : [])
    );

    localStorage.setItem(
      "bookmarks",
      JSON.stringify(Array.isArray(data.bookmarks) ? data.bookmarks : [])
    );

    return true;
  } catch (err) {
    console.error("Restore gagal:", err);
    return false;
  }
}
