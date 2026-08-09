import { FaUserShield, FaTools } from "react-icons/fa";
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
          className={`inline-flex items-center gap-1 rounded-full bg-[var(--accent-3)] px-2 py-0.5 text-[9px] font-black uppercase leading-none tracking-widest text-white shadow-[0_1px_4px_rgba(244,63,94,0.5)] ${className}`}
        >
          <FaUserShield size={8} className="shrink-0" />
          ADMIN
        </span>
      )}
      {role === "staff" && (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-emerald-400 px-2 py-0.5 text-[9px] font-black uppercase leading-none tracking-widest text-emerald-950 shadow-[0_1px_4px_rgba(52,211,153,0.5)] ${className}`}
        >
          <FaTools size={8} className="shrink-0" />
          STAFF
        </span>
      )}
      {isPremium && <VipBadge className={className} />}
      <XpLeaderboardBadge rank={xpRank} className={className} />
      <TitleRushWinnerBadge rank={titleRushRank} className={className} />
    </>
  );
}
