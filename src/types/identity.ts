import type { BadgeContext } from "@/lib/badgeRules";

/**
 * Kontrak identitas tunggal. Semua API yang mengirim "orang" idealnya memakai
 * bentuk ini supaya komentar, leaderboard, marathon, postingan dan profil
 * menampilkan data yang sama.
 */
export type PublicUser = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  /** id border dari registry avatarBorders (mis. "gold", "event"). */
  avatarBorder: string | null;
  level: number;
  role: string | null;
  isPremium: boolean;
  totalReads: number;
  xpRank?: number | null;
  titleRushRank?: number | null;
  marathon?: { rank: number; period: "weekly" | "monthly" } | null;
};

/** Ambil bagian yang dibutuhkan komponen badge. */
export function badgeContextFrom(user: PublicUser): BadgeContext {
  return {
    role: user.role,
    isPremium: user.isPremium,
    totalReads: user.totalReads,
    xpRank: user.xpRank ?? null,
    titleRushRank: user.titleRushRank ?? null,
    marathon: user.marathon ?? null,
  };
}
