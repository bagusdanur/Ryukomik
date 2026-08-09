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
          style={{ "--rk-badge-shine-delay": "1.1s" } as React.CSSProperties}
          className={`rk-badge-premium inline-flex items-center gap-1 rounded-full border border-[var(--accent-3)]/40 bg-gradient-to-r from-[var(--accent-3)]/35 via-rose-400/20 to-[var(--accent-3)]/35 px-2 py-0.5 text-[9px] font-black uppercase leading-none tracking-widest text-white shadow-[0_0_10px_-2px_var(--accent-3)] ${className}`}
        >
          <FaUserShield size={8} className="shrink-0 text-rose-200" />
          ADMIN
        </span>
      )}
      {role === "staff" && (
        <span
          style={{ "--rk-badge-shine-delay": "2.2s" } as React.CSSProperties}
          className={`rk-badge-premium inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-gradient-to-r from-emerald-400/35 via-emerald-300/20 to-emerald-400/35 px-2 py-0.5 text-[9px] font-black uppercase leading-none tracking-widest text-white shadow-[0_0_10px_-2px_rgba(52,211,153,0.7)] ${className}`}
        >
          <FaTools size={8} className="shrink-0 text-emerald-200" />
          STAFF
        </span>
      )}
      {isPremium && <VipBadge className={className} />}
      <XpLeaderboardBadge rank={xpRank} className={className} />
      <TitleRushWinnerBadge rank={titleRushRank} className={className} />
    </>
  );
}
