"use client";

/**
 * Logout TOTAL: cabut sesi auth lokal di server (revoke + hapus cookie
 * rk_session) DAN bersihkan sesi Supabase lama. Jangan pakai
 * supabase.auth.signOut() saja — itu tidak menghapus cookie auth lokal,
 * sehingga user tetap terlogin.
 */
export async function logoutEverywhere(): Promise<void> {
  // Cache sesi lokal berumur 4 menit: tanpa dibersihkan, akun berikutnya
  // yang login masih dianggap user lama (penyebab "admin tetap ditolak").
  try {
    const { clearLocalSessionCache } = await import("@/lib/auth/getSession");
    clearLocalSessionCache();
  } catch {
    // modul sesi tidak tersedia — lanjut
  }
  try {
    const { clearAllCachedRoles } = await import("@/utils/roleCache");
    clearAllCachedRoles();
  } catch {
    // cache role best-effort
  }

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
