/**
 * Aturan badge — satu sumber kebenaran untuk SEMUA permukaan (komentar,
 * leaderboard, marathon, post, profil). Tambah badge baru = tambah satu entri
 * di BADGE_RULES; tidak perlu mengedit halaman satu per satu.
 *
 * File ini sengaja bebas JSX/React supaya bisa dites sebagai fungsi murni.
 */

export type BadgeContext = {
  role?: string | null;
  isPremium?: boolean | null;
  totalReads?: number | null;
  xpRank?: number | null;
  titleRushRank?: number | null;
  marathon?: { rank: number; period: "weekly" | "monthly" } | null;
};

export type BadgeId =
  | "admin"
  | "staff"
  | "vip"
  | "marathon"
  | "community"
  | "xpRank"
  | "titleRush";

export type BadgeRule = {
  id: BadgeId;
  /** Urutan tampil (kecil = lebih kiri). */
  order: number;
  visible: (ctx: BadgeContext) => boolean;
};

/** Ambang komunitas, dipakai juga oleh CommunityBadges. */
export const COMMUNITY_THRESHOLDS = { veteran: 1000, rajin: 300 } as const;

export const BADGE_RULES: BadgeRule[] = [
  { id: "admin", order: 10, visible: (c) => c.role === "admin" },
  { id: "staff", order: 20, visible: (c) => c.role === "staff" },
  { id: "vip", order: 30, visible: (c) => Boolean(c.isPremium) },
  { id: "marathon", order: 35, visible: (c) => Boolean(c.marathon && c.marathon.rank > 0) },
  {
    id: "community",
    order: 40,
    visible: (c) => Number(c.totalReads || 0) >= COMMUNITY_THRESHOLDS.rajin,
  },
  {
    id: "xpRank",
    order: 50,
    visible: (c) => c.xpRank === 1 || c.xpRank === 2 || c.xpRank === 3,
  },
  {
    id: "titleRush",
    order: 60,
    visible: (c) => c.titleRushRank === 1 || c.titleRushRank === 2 || c.titleRushRank === 3,
  },
];

/** Id badge yang harus tampil, sudah urut dan dibatasi jumlahnya. */
export function visibleBadgeIds(ctx: BadgeContext, max = Infinity): BadgeId[] {
  return BADGE_RULES.filter((rule) => rule.visible(ctx))
    .sort((a, b) => a.order - b.order)
    .slice(0, max)
    .map((rule) => rule.id);
}
