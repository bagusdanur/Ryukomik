/**
 * Penamaan server anime — satu sumber untuk halaman episode DAN nobar.
 *
 * Server "Ryu-lokal" (filedon/mega/blogger/streamUrl) tanpa iklan selalu
 * bernama "Ryu-lokal <kualitas>"; server lain pakai nama providernya, mis.
 * "Vidhide 480p". Dipakai bersama supaya nama di episode page, tombol nobar,
 * dan ruang nobar persis sama.
 */

export type AnimePlayerLike = {
  name?: string;
  iframe?: string;
  streamUrl?: string;
};

/** Server tanpa iklan (Ryu-lokal): filedon, mega, vidhide, dan player
 *  desustream (odcdn/odstream/ondesu2hd) di-resolve jadi <video> lokal
 *  (MP4 langsung, atau HLS via hls.js untuk vidhide); Blogger bersih dari
 *  sananya jadi iframe-nya dipakai langsung. */
export function isCleanPlayer(player: AnimePlayerLike) {
  return (
    /filedon\.co|mega\.nz|blogger\.com|desustream|odcloud|vidhide/i.test(player.iframe ?? "") ||
    Boolean(player.streamUrl)
  );
}

/** Kualitas dari nama mentah, mis. "480p vidhide" -> "480p". */
export function playerQuality(player: AnimePlayerLike) {
  return (player.name || "").match(/(\d{3,4}\s*p)/i)?.[1]?.replace(/\s+/g, "").toLowerCase() || "";
}

/** Nama dasar tanpa kualitas, mis. "480p vidhide" -> "Vidhide". */
export function playerBaseName(player: AnimePlayerLike) {
  if (isCleanPlayer(player)) return "Ryu-lokal";
  return (player.name || "Server").replace("S-", "").replace(/\d{3,4}\s*p/i, "").trim() || "Server";
}

/** Nama tampil lengkap, mis. "Ryu-lokal 480p" atau "Vidhide 360p". */
export function playerDisplayName(player: AnimePlayerLike) {
  const base = playerBaseName(player);
  const quality = playerQuality(player);
  return quality ? `${base} ${quality}` : base;
}
