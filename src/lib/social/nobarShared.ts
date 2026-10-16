/**
 * Konstanta nobar yang dipakai KLIEN maupun server.
 *
 * Sengaja tidak memakai `import "server-only"` supaya bisa diimpor komponen
 * klien. Tipe & helper khusus server ada di `src/lib/social/nobar.ts`.
 */

export const NOBAR_EMOJIS = ["🔥", "😂", "😱", "😭", "👏", "❤️"] as const;

/** Interval polling ruang nobar (ms). */
export const NOBAR_POLL_MS = 2500;

/** Batas panjang satu pesan chat nobar. */
export const NOBAR_MESSAGE_MAX = 300;
