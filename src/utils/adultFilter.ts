"use client";

import { ADULT_ENABLED } from "@/config/siteMode";

/**
 * Preferensi filter konten 18+.
 *
 * Disimpan dua tempat:
 * - localStorage: dipakai komponen klien (SourcePicker, daftar) supaya instan.
 * - cookie `rk_hide_adult`: dipakai server component (mis. /tonton) untuk
 *   menyembunyikan section dewasa saat render pertama, tanpa flash.
 */
export const ADULT_PREF_KEY = "rk-hide-adult";
export const ADULT_PREF_COOKIE = "rk_hide_adult";
export const ADULT_PREF_EVENT = "rk-adult-pref-changed";

/**
 * Mode SFW: selalu `true` — konten 18+ tidak pernah ditampilkan, apa pun isi
 * localStorage. Mode dewasa: ikuti pilihan pengunjung (default tampil).
 */
export function isAdultHidden(): boolean {
  if (!ADULT_ENABLED) return true;
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ADULT_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAdultHidden(hidden: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADULT_PREF_KEY, hidden ? "1" : "0");
  } catch {
    // storage penuh/diblokir: cookie tetap diset di bawah
  }
  const maxAge = 365 * 24 * 60 * 60;
  document.cookie = `${ADULT_PREF_COOKIE}=${hidden ? "1" : "0"}; path=/; max-age=${maxAge}; samesite=lax`;
  window.dispatchEvent(new CustomEvent(ADULT_PREF_EVENT, { detail: hidden }));
}
