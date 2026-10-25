"use client";

import { FaTools, FaUserShield } from "react-icons/fa";
import { visibleBadgeIds, type BadgeContext } from "@/lib/badgeRules";
import VipBadge from "@/components/VipBadge";
import CommunityBadges from "@/components/CommunityBadges";
import XpLeaderboardBadge from "@/components/XpLeaderboardBadge";
import TitleRushWinnerBadge from "@/components/TitleRushWinnerBadge";
import MarathonWinnerBadge from "@/components/MarathonWinnerBadge";

/**
 * Render badge berdasarkan registry (badgeRules). Semua tempat memakai ini,
 * jadi menambah badge baru cukup satu entri di BADGE_RULES.
 */
export default function BadgeList({
  ctx,
  className = "",
  max,
}: {
  ctx: BadgeContext;
  className?: string;
  max?: number;
}) {
  const ids = visibleBadgeIds(ctx, max ?? Infinity);

  return (
    <>
      {ids.map((id) => {
        switch (id) {
          case "admin":
            return (
              <span
                key={id}
                className={`inline-flex items-center gap-1 rounded-full bg-[var(--accent-3)] px-2 py-0.5 text-[9px] font-black uppercase leading-none tracking-widest text-white shadow-[0_1px_4px_rgba(244,63,94,0.5)] ${className}`}
              >
                <FaUserShield size={8} className="shrink-0" />
                ADMIN
              </span>
            );
          case "staff":
            return (
              <span
                key={id}
                className={`inline-flex items-center gap-1 rounded-full bg-emerald-400 px-2 py-0.5 text-[9px] font-black uppercase leading-none tracking-widest text-emerald-950 shadow-[0_1px_4px_rgba(52,211,153,0.5)] ${className}`}
              >
                <FaTools size={8} className="shrink-0" />
                STAFF
              </span>
            );
          case "vip":
            return <VipBadge key={id} className={className} />;
          case "marathon":
            return ctx.marathon ? (
              <MarathonWinnerBadge
                key={id}
                rank={ctx.marathon.rank}
                period={ctx.marathon.period}
                className={className}
              />
            ) : null;
          case "community":
            return <CommunityBadges key={id} totalReads={ctx.totalReads} className={className} />;
          case "xpRank":
            return <XpLeaderboardBadge key={id} rank={ctx.xpRank} className={className} />;
          case "titleRush":
            return <TitleRushWinnerBadge key={id} rank={ctx.titleRushRank} className={className} />;
          default:
            return null;
        }
      })}
    </>
  );
}
