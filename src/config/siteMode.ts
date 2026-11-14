/**
 * Mode situs: satu codebase, dua deployment.
 *
 * - `sfw`   → ryukomik.com. Konten 18+ tidak pernah dikirim ke klien, dan
 *             seluruh UI sakelar/blur/gerbang usia tidak dirender.
 * - `adult` → situs kedua (domain terpisah, belum aktif). Semua jalur 18+
 *             hidup dengan gerbang usia wajib.
 *
 * Nilai dibaca dari NEXT_PUBLIC_ supaya bisa dipakai komponen klien maupun
 * server. Default `sfw` — lebih aman salah ke arah bersih daripada salah ke
 * arah sebaliknya.
 */
export type SiteMode = "sfw" | "adult";

export const SITE_MODE: SiteMode =
  process.env.NEXT_PUBLIC_SITE_MODE === "adult" ? "adult" : "sfw";

/** Semua jalur konten dewasa hanya boleh hidup saat ini `true`. */
export const ADULT_ENABLED = SITE_MODE === "adult";
