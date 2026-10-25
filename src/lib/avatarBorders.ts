/**
 * Registry border avatar — mendukung dua tipe:
 *
 *  - "css"   : ring + glow dari CSS (0 byte, tajam di semua ukuran)
 *  - "image" : frame PNG/SVG transparan milik sendiri (ditaruh di public/borders)
 *
 * Menambah border baru cukup satu entri di sini; semua <UserAvatar> di situs
 * otomatis bisa memakainya.
 */

export type AvatarBorderId = "default" | "gold" | "violet" | "cyan" | "ember" | "event" | "contoh";

export type AvatarBorder = {
  id: AvatarBorderId;
  label: string;
  /** "css" (default) atau "image". */
  type?: "css" | "image";
  /** Warna ring utama untuk tipe css. */
  ring: string;
  /** Glow lembut untuk tipe css. */
  glow?: string;
  /** Path frame (hanya tipe image). Wajib diawali "/borders/". */
  src?: string;
  /** Seberapa jauh frame keluar dari avatar, dalam px (hanya tipe image). */
  inset?: number;
};

export const AVATAR_BORDERS: Record<AvatarBorderId, AvatarBorder> = {
  default: { id: "default", label: "Default", type: "css", ring: "rgba(255,255,255,0.14)" },
  gold: {
    id: "gold",
    label: "Gold",
    type: "css",
    ring: "#fbbf24",
    glow: "0 0 10px rgba(251,191,36,0.45)",
  },
  violet: {
    id: "violet",
    label: "Violet",
    type: "css",
    ring: "#a78bfa",
    glow: "0 0 10px rgba(167,139,250,0.45)",
  },
  cyan: {
    id: "cyan",
    label: "Cyan",
    type: "css",
    ring: "#22d3ee",
    glow: "0 0 10px rgba(34,211,238,0.4)",
  },
  ember: {
    id: "ember",
    label: "Ember",
    type: "css",
    ring: "#f97316",
    glow: "0 0 10px rgba(249,115,22,0.45)",
  },
  event: {
    id: "event",
    label: "Event",
    type: "css",
    ring: "#f472b6",
    glow: "0 0 12px rgba(244,114,182,0.5)",
  },
  // Contoh frame gambar (aset sendiri) — bukti mekanisme tipe "image" jalan.
  contoh: {
    id: "contoh",
    label: "Contoh",
    type: "image",
    ring: "#fbbf24",
    src: "/borders/contoh.svg",
    inset: 7,
  },
};

export function resolveAvatarBorder(id?: string | null): AvatarBorder {
  if (!id) return AVATAR_BORDERS.default;
  return AVATAR_BORDERS[id as AvatarBorderId] ?? AVATAR_BORDERS.default;
}

/** Frame gambar yang valid: tipe image + path lokal di /borders/. */
export function isImageBorder(border: AvatarBorder): border is AvatarBorder & { src: string } {
  return border.type === "image" && typeof border.src === "string" && border.src.startsWith("/borders/");
}

/**
 * Nilai box-shadow untuk ring + glow.
 *
 * Border yang dipilih user SELALU menang; `overrideRing` hanya dipakai kalau
 * user belum memilih border (dulu override ini menutupi border di komentar
 * sehingga pilihan user tidak terlihat).
 */
export function avatarBorderShadow(id?: string | null, overrideRing?: string): string {
  const border = resolveAvatarBorder(id);
  const hasCustomBorder = Boolean(id) && border.id !== "default";

  if (hasCustomBorder) {
    return border.glow
      ? `0 0 0 2px ${border.ring}, ${border.glow}`
      : `0 0 0 2px ${border.ring}`;
  }

  return `0 0 0 2px ${overrideRing || border.ring}`;
}
