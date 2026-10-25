import BadgeList from "@/components/BadgeList";

/**
 * Backward-compatible wrapper. Semua pemakai lama otomatis ikut registry badge
 * (badgeRules), jadi badge baru muncul di semua permukaan tanpa mengedit sini.
 */
export default function UserBadges({
  role,
  isPremium,
  titleRushRank,
  xpRank,
  totalReads,
  marathon,
  max,
  className = "",
}: {
  role?: string | null;
  isPremium?: boolean | null;
  titleRushRank?: number | null;
  xpRank?: number | null;
  totalReads?: number | null;
  marathon?: { rank: number; period: "weekly" | "monthly" } | null;
  max?: number;
  className?: string;
}) {
  return (
    <BadgeList
      ctx={{ role, isPremium, titleRushRank, xpRank, totalReads, marathon }}
      max={max}
      className={className}
    />
  );
}
