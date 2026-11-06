import BadgeList from "@/components/BadgeList";

/** Satu bentuk data user untuk semua badge — cukup oper objek user sekali. */
export type BadgeUser = {
  role?: string | null;
  is_scanlator?: boolean | null;
  is_premium?: boolean | null;
  total_reads?: number | null;
  title_rush_rank?: number | null;
  xp_rank?: number | null;
  marathon?: { rank: number; period: "weekly" | "monthly" } | null;
};

/**
 * Wrapper badge. Bisa dipakai dua cara:
 *  - `<UserBadges user={author} />`  ← disarankan, satu objek user
 *  - `<UserBadges role="admin" isPremium />` ← kompatibel dengan pemakaian lama
 */
export default function UserBadges({
  user,
  role,
  isScanlator,
  isPremium,
  titleRushRank,
  xpRank,
  totalReads,
  marathon,
  max,
  className = "",
}: {
  user?: BadgeUser | null;
  role?: string | null;
  isScanlator?: boolean | null;
  isPremium?: boolean | null;
  titleRushRank?: number | null;
  xpRank?: number | null;
  totalReads?: number | null;
  marathon?: { rank: number; period: "weekly" | "monthly" } | null;
  max?: number;
  className?: string;
}) {
  const ctx = {
    role: role ?? user?.role,
    isScanlator: isScanlator ?? user?.is_scanlator,
    isPremium: isPremium ?? user?.is_premium,
    titleRushRank: titleRushRank ?? user?.title_rush_rank,
    xpRank: xpRank ?? user?.xp_rank,
    totalReads: totalReads ?? user?.total_reads,
    marathon: marathon ?? user?.marathon,
  };

  return <BadgeList ctx={ctx} max={max} className={className} />;
}
