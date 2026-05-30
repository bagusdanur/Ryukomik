import { FaGamepad } from "react-icons/fa";

const rankMeta = {
  1: { label: "G1", title: "Top 1 Game Title Rush" },
  2: { label: "G2", title: "Top 2 Game Title Rush" },
  3: { label: "G3", title: "Top 3 Game Title Rush" },
} as const;

export default function TitleRushWinnerBadge({
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
      className={`${className} inline-flex h-[18px] min-w-[2rem] items-center justify-center gap-1 rounded-full bg-[color:color-mix(in_srgb,var(--accent-2)_14%,transparent)] px-1.5 text-[9px] font-black uppercase leading-none tracking-wide text-[var(--accent-2)]`}
      title={title}
    >
      <FaGamepad size={8} className="shrink-0" />
      {label}
    </span>
  );
}
