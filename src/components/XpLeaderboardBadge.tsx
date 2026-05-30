import { FaBolt } from "react-icons/fa";

const rankMeta = {
  1: { label: "X1", title: "Top 1 XP Leaderboard" },
  2: { label: "X2", title: "Top 2 XP Leaderboard" },
  3: { label: "X3", title: "Top 3 XP Leaderboard" },
} as const;

export default function XpLeaderboardBadge({
  rank,
  className = "",
}: {
  rank?: number | null;
  className?: string;
}) {
  if (rank !== 1 && rank !== 2 && rank !== 3) return null;

  const { label, title } = rankMeta[rank];

  return (
    <span
      className={`${className} inline-flex h-[18px] min-w-[2rem] items-center justify-center gap-1 rounded-full bg-[color:color-mix(in_srgb,var(--accent)_14%,transparent)] px-1.5 text-[9px] font-black uppercase leading-none tracking-wide text-[var(--accent-2)]`}
      title={title}
    >
      <FaBolt size={8} className="shrink-0" />
      {label}
    </span>
  );
}
