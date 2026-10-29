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
  | "shop-118"
  | "marathon-1"
  | "marathon-2"
  | "marathon-3";

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
  /** Pengali ukuran frame terhadap kotak avatar (hanya tipe image).
   *  Default IMAGE_FRAME_SCALE; dipakai per-frame kalau ada yang perlu beda. */
  scale?: number;
  /** Kelompok tampilan di picker (lihat borderGroup). */
  group?: AvatarBorderGroup;
  /** true = aset contoh/uji, tidak ditampilkan di picker. */
  hidden?: boolean;
  /** true = hanya untuk member premium (non-admin). */
  premiumOnly?: boolean;
  /** hanya untuk peringkat Marathon minggu berjalan (1..3). */
  rankOnly?: 1 | 2 | 3;
};

export type AvatarBorderGroup = "dasar" | "klasik" | "shop" | "event";

/** Kelompok picker: warna CSS, frame klasik (SVG), frame shop (WebP). */
export function borderGroup(border: AvatarBorder): AvatarBorderGroup {
  if (border.group) return border.group;
  if ((border.type ?? "css") === "css") return "dasar";
  if ((border.src || "").includes("/borders/shop-")) return "shop";
  return "klasik";
}

/** Frame gambar digambar lebih besar dari kotak avatar supaya ornamennya
 *  tidak terlihat mepet (perilaku lama 1:1 membuat sayap/aura terasa kecil). */
export const IMAGE_FRAME_SCALE = 1.2;


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
  // Aset contoh untuk uji render — tidak dipakai di picker.
  contoh: { id: "contoh", label: "Contoh", type: "image", ring: "#fbbf24", src: "/borders/contoh.svg", hidden: true },
  sakura: { id: "sakura", label: "Sakura", type: "image", ring: "#f472b6", src: "/borders/sakura.svg" },
  api: { id: "api", label: "Api", type: "image", ring: "#f97316", src: "/borders/api.svg" },
  es: { id: "es", label: "Es", type: "image", ring: "#38bdf8", src: "/borders/es.svg" },
  galaksi: { id: "galaksi", label: "Galaksi", type: "image", ring: "#8b5cf6", src: "/borders/galaksi.svg" },
  emas: { id: "emas", label: "Emas", type: "image", ring: "#fbbf24", src: "/borders/emas.svg" },

  // Frame dari shop Ryzukomik (aset milik sendiri, sudah dioptimasi ke WebP).
  "shop-105": { id: "shop-105", hidden: true, label: "Blue Effect", type: "image", ring: "#8b5cf6", src: "/borders/shop-105.webp" },
  "shop-107": { id: "shop-107", label: "Teme Purple", type: "image", ring: "#8b5cf6", src: "/borders/shop-107.webp" },
  "shop-108": { id: "shop-108", hidden: true, label: "Black Flower", type: "image", ring: "#f59e0b", src: "/borders/shop-108.webp" },
  "shop-109": { id: "shop-109", hidden: true, label: "Silver Moon", type: "image", ring: "#38bdf8", src: "/borders/shop-109.webp" },
  "shop-110": { id: "shop-110", premiumOnly: true, label: "Red Wings", type: "image", ring: "#8b5cf6", src: "/borders/shop-110.webp" },
  "shop-111": { id: "shop-111", hidden: true, label: "Shark", type: "image", ring: "#f59e0b", src: "/borders/shop-111.webp" },
  "shop-112": { id: "shop-112", hidden: true, label: "Black Eye", type: "image", ring: "#8b5cf6", src: "/borders/shop-112.webp" },
  "shop-113": { id: "shop-113", premiumOnly: true, label: "Black Wings", type: "image", ring: "#a855f7", src: "/borders/shop-113.webp" },
  "shop-114": { id: "shop-114", label: "White Wing", type: "image", ring: "#a855f7", src: "/borders/shop-114.webp" },
  "shop-115": { id: "shop-115", hidden: true, label: "White Flowers", type: "image", ring: "#f59e0b", src: "/borders/shop-115.webp" },
  "shop-116": { id: "shop-116", label: "Teme Red", type: "image", ring: "#38bdf8", src: "/borders/shop-116.webp" },
  "shop-117": { id: "shop-117", hidden: true, label: "White Skull", type: "image", ring: "#a855f7", src: "/borders/shop-117.webp" },
  "shop-118": { id: "shop-118", hidden: true, label: "Noir Splatter Aura", type: "image", ring: "#f59e0b", src: "/borders/shop-118.webp" },
  "marathon-1": { id: "marathon-1", label: "Juara 1 Marathon", type: "image", ring: "#f5c542", src: "/borders/marathon-1-v2.webp", group: "event", rankOnly: 1, scale: 1.64 },
  "marathon-2": { id: "marathon-2", label: "Juara 2 Marathon", type: "image", ring: "#cbd5e1", src: "/borders/marathon-2-v2.webp", group: "event", rankOnly: 2, scale: 1.56 },
  "marathon-3": { id: "marathon-3", label: "Juara 3 Marathon", type: "image", ring: "#d6a17a", src: "/borders/marathon-3-v2.webp", group: "event", rankOnly: 3, scale: 1.55 },

};

/**
 * Frame shop (aset yang diimpor dari Ryzukomik) dikunci sementara: hanya admin
 * yang boleh memakainya. Belum ada pencatatan kepemilikan item, jadi membuka
 * frame ini untuk semua user = barang jualan dibagikan gratis.
 * Untuk membuka untuk semua, cukup kosongkan daftar ini.
 */
export const ADMIN_ONLY_BORDERS = new Set<AvatarBorderId>([
  "shop-105",
  "shop-107",
  "shop-108",
  "shop-109",
  "shop-111",
  "shop-112",
  "shop-114",
  "shop-115",
  "shop-116",
  "shop-117",
  "shop-118",
]);

export function isAdminOnlyBorder(id?: string | null): boolean {
  return Boolean(id) && ADMIN_ONLY_BORDERS.has(id as AvatarBorderId);
}

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
