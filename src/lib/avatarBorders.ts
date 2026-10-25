/**
 * Registry border avatar — mendukung dua tipe:
 *
 *  - "css"   : ring + glow dari CSS (0 byte, tajam di semua ukuran)
 *  - "image" : frame PNG/SVG transparan milik sendiri (ditaruh di public/borders)
 *
 * Menambah border baru cukup satu entri di sini; semua <UserAvatar> di situs
 * otomatis bisa memakainya.
 */

export type AvatarBorderId =
  | "default"
  | "gold"
  | "violet"
  | "cyan"
  | "ember"
  | "event"
  | "contoh"
  | "sakura"
  | "api"
  | "es"
  | "galaksi"
  | "emas"
  | "shop-105"
  | "shop-107"
  | "shop-108"
  | "shop-109"
  | "shop-110"
  | "shop-111"
  | "shop-112"
  | "shop-113"
  | "shop-114"
  | "shop-115"
  | "shop-116"
  | "shop-117"
  | "shop-118";

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
  /** Perbesaran frame relatif terhadap avatar (hanya tipe image). */
  scale?: number;
  /** "over" = frame menutupi avatar (butuh lubang transparan); "under" = di belakang avatar. */
  layer?: "over" | "under";
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
  // Frame gambar (SVG orisinal Ryukomik, bukan aset pihak ketiga).
  contoh: { id: "contoh", label: "Contoh", type: "image", ring: "#fbbf24", src: "/borders/contoh.svg", inset: 7 },
  sakura: { id: "sakura", label: "Sakura", type: "image", ring: "#f472b6", src: "/borders/sakura.svg", inset: 8 },
  api: { id: "api", label: "Api", type: "image", ring: "#f97316", src: "/borders/api.svg", inset: 8 },
  es: { id: "es", label: "Es", type: "image", ring: "#38bdf8", src: "/borders/es.svg", inset: 7 },
  galaksi: { id: "galaksi", label: "Galaksi", type: "image", ring: "#8b5cf6", src: "/borders/galaksi.svg", inset: 7 },
  emas: { id: "emas", label: "Emas", type: "image", ring: "#fbbf24", src: "/borders/emas.svg", inset: 8 },

  // Frame dari shop Ryzukomik (aset milik sendiri, sudah dioptimasi ke WebP).
  "shop-105": { id: "shop-105", label: "Blue Effect", type: "image", ring: "#8b5cf6", src: "/borders/shop-105.webp", scale: 1.71, layer: "over" },
  "shop-107": { id: "shop-107", label: "Teme Purple", type: "image", ring: "#8b5cf6", src: "/borders/shop-107.webp", scale: 2.15, layer: "over" },
  "shop-108": { id: "shop-108", label: "Black Flower", type: "image", ring: "#f59e0b", src: "/borders/shop-108.webp", scale: 2.0, layer: "over" },
  "shop-109": { id: "shop-109", label: "Silver Moon", type: "image", ring: "#38bdf8", src: "/borders/shop-109.webp", scale: 1.5, layer: "under" },
  "shop-110": { id: "shop-110", label: "Red Wings", type: "image", ring: "#8b5cf6", src: "/borders/shop-110.webp", scale: 1.66, layer: "over" },
  "shop-111": { id: "shop-111", label: "Shark", type: "image", ring: "#f59e0b", src: "/borders/shop-111.webp", scale: 1.5, layer: "under" },
  "shop-112": { id: "shop-112", label: "Black Eye", type: "image", ring: "#8b5cf6", src: "/borders/shop-112.webp", scale: 2.2, layer: "over" },
  "shop-113": { id: "shop-113", label: "Black Wings", type: "image", ring: "#a855f7", src: "/borders/shop-113.webp", scale: 1.5, layer: "under" },
  "shop-114": { id: "shop-114", label: "White Wing", type: "image", ring: "#a855f7", src: "/borders/shop-114.webp", scale: 1.5, layer: "under" },
  "shop-115": { id: "shop-115", label: "White Flowers", type: "image", ring: "#f59e0b", src: "/borders/shop-115.webp", scale: 2.0, layer: "over" },
  "shop-116": { id: "shop-116", label: "Teme Red", type: "image", ring: "#38bdf8", src: "/borders/shop-116.webp", scale: 2.12, layer: "over" },
  "shop-117": { id: "shop-117", label: "White Skull", type: "image", ring: "#a855f7", src: "/borders/shop-117.webp", scale: 1.92, layer: "over" },
  "shop-118": { id: "shop-118", label: "Noir Splatter Aura", type: "image", ring: "#f59e0b", src: "/borders/shop-118.webp", scale: 2.09, layer: "over" },
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
