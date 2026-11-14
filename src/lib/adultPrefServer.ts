import "server-only";

import { cookies } from "next/headers";

import { ADULT_ENABLED } from "@/config/siteMode";

export const ADULT_PREF_COOKIE = "rk_hide_adult";

/**
 * Apakah konten 18+ harus disembunyikan saat render.
 *
 * Mode SFW: SELALU `true`. Cookie `rk_hide_adult` diabaikan sepenuhnya — dulu
 * defaultnya justru menampilkan konten dewasa bagi pengunjung baru dan bot.
 * Mode dewasa: tetap menghormati pilihan pengunjung lewat cookie.
 */
export async function adultContentHidden(): Promise<boolean> {
  if (!ADULT_ENABLED) return true;
  try {
    const store = await cookies();
    return store.get(ADULT_PREF_COOKIE)?.value === "1";
  } catch {
    return false;
  }
}
