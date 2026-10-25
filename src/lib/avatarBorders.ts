/**
 * Registry border avatar — CSS murni (ring + glow), tanpa file gambar.
 * Nanti tinggal simpan id-nya di profil (`avatar_border`) dan semua permukaan
 * yang memakai <UserAvatar> langsung ikut.
 */

export type AvatarBorderId = "default" | "gold" | "violet" | "cyan" | "ember" | "event";

export type AvatarBorder = {
  id: AvatarBorderId;
  label: string;
  /** Warna ring utama (dipakai box-shadow 0 0 0 2px). */
  ring: string;
  /** Glow lembut di luar ring, opsional. */
  glow?: string;
};

export const AVATAR_BORDERS: Record<AvatarBorderId, AvatarBorder> = {
  default: { id: "default", label: "Default", ring: "rgba(255,255,255,0.14)" },
  gold: {
    id: "gold",
    label: "Gold",
    ring: "#fbbf24",
    glow: "0 0 10px rgba(251,191,36,0.45)",
  },
  violet: {
    id: "violet",
    label: "Violet",
    ring: "#a78bfa",
    glow: "0 0 10px rgba(167,139,250,0.45)",
  },
  cyan: {
    id: "cyan",
    label: "Cyan",
    ring: "#22d3ee",
    glow: "0 0 10px rgba(34,211,238,0.4)",
  },
  ember: {
    id: "ember",
    label: "Ember",
    ring: "#f97316",
    glow: "0 0 10px rgba(249,115,22,0.45)",
  },
  event: {
    id: "event",
    label: "Event",
    ring: "#f472b6",
    glow: "0 0 12px rgba(244,114,182,0.5)",
  },
};

export function resolveAvatarBorder(id?: string | null): AvatarBorder {
  if (!id) return AVATAR_BORDERS.default;
  return AVATAR_BORDERS[id as AvatarBorderId] ?? AVATAR_BORDERS.default;
}

/** Nilai box-shadow lengkap untuk ring + glow. */
export function avatarBorderShadow(id?: string | null, overrideRing?: string): string {
  const border = resolveAvatarBorder(id);
  const ring = overrideRing || border.ring;
  return `0 0 0 2px ${ring}${border.glow && !overrideRing ? `, ${border.glow}` : ""}`;
}
