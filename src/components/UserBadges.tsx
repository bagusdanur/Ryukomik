import VipBadge from "@/components/VipBadge";
import TitleRushWinnerBadge from "@/components/TitleRushWinnerBadge";
import XpLeaderboardBadge from "@/components/XpLeaderboardBadge";

export default function UserBadges({
  role,
  isPremium,
  titleRushRank,
  xpRank,
  className = "",
}: {
  role?: string | null;
  isPremium?: boolean | null;
  titleRushRank?: number | null;
  xpRank?: number | null;
  className?: string;
}) {
  return (
    <>
      {role === "admin" && (
        <span
          className={`inline-flex items-center rounded-full border border-[var(--accent-3)]/25 bg-[var(--accent-3)]/12 px-2 py-0.5 text-[9px] font-black uppercase leading-none tracking-widest text-[var(--accent-3)] ${className}`}
        >
          ADMIN
        </span>
      )}
      {isPremium && <VipBadge className={className} />}
      <XpLeaderboardBadge rank={xpRank} className={className} />
      <TitleRushWinnerBadge rank={titleRushRank} className={className} />
    </>
  );
}
