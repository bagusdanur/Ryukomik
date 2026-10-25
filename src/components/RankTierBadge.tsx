import { FaCrown, FaMedal, FaShieldAlt, FaStar } from "react-icons/fa";

type Tier = {
  min: number;
  label: string;
  Icon: typeof FaStar;
  className: string;
};

/** Tier pembaca berdasarkan level. Level < 10 tidak menampilkan badge. */
const TIERS: Tier[] = [
  {
    min: 100,
    label: "Legend",
    Icon: FaCrown,
    className: "border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-300",
  },
  {
    min: 75,
    label: "Elite",
    Icon: FaMedal,
    className: "border-violet-400/30 bg-violet-500/15 text-violet-300",
  },
  {
    min: 50,
    label: "Veteran",
    Icon: FaShieldAlt,
    className: "border-sky-400/30 bg-sky-500/15 text-sky-300",
  },
  {
    min: 30,
    label: "Pro",
    Icon: FaStar,
    className: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
  },
  {
    min: 10,
    label: "Reader",
    Icon: FaStar,
    className: "border-white/15 bg-white/[0.06] text-white/55",
  },
];

export function tierForLevel(level?: number | null): Tier | null {
  const lv = Number(level) || 0;
  for (const tier of TIERS) {
    if (lv >= tier.min) return tier;
  }
  return null;
}

export default function RankTierBadge({
  level,
  className = "",
}: {
  level?: number | null;
  className?: string;
}) {
  const tier = tierForLevel(level);
  if (!tier) return null;
  const { Icon, label } = tier;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase leading-none tracking-widest ${tier.className} ${className}`}
    >
      <Icon size={7} className="shrink-0" />
      {label}
    </span>
  );
}
