import "server-only";

import { cookies } from "next/headers";

export const ADULT_PREF_COOKIE = "rk_hide_adult";

/**
 * Apakah pengunjung memilih menyembunyikan konten 18+.
 * Dibaca dari cookie supaya server bisa memfilter saat render (bukan setelah
 * hidrasi), jadi tidak ada flash konten dewasa.
 */
export async function adultContentHidden(): Promise<boolean> {
  try {
    const store = await cookies();
    return store.get(ADULT_PREF_COOKIE)?.value === "1";
  } catch {
    return false;
  }
}
