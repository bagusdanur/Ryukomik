"use client";

/**
 * Logout TOTAL: cabut sesi auth lokal di server (revoke + hapus cookie
 * rk_session) DAN bersihkan sesi Supabase lama. Jangan pakai
 * supabase.auth.signOut() saja — itu tidak menghapus cookie auth lokal,
 * sehingga user tetap terlogin.
 */
export async function logoutEverywhere(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {
    // offline: cookie tetap dibersihkan di bawah lewat respons gagal pun lanjut
  }
  try {
    localStorage.removeItem("rk_access");
  } catch {
    // storage bisa diblokir
  }
  try {
    const { supabase } = await import("@/lib/supabaseClient");
    await supabase.auth.signOut().catch(() => undefined);
  } catch {
    // supabase client bisa gagal dimuat — logout lokal tetap jalan
  }
}
