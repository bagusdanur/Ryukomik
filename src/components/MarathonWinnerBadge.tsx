import { FaCrown, FaTrophy } from "react-icons/fa";

/**
 * Badge juara Marathon Reading — bentuknya sama dengan badge lain (VIP/ADMIN).
 * Teksnya singkat pakai inisial: J1 MGG (juara 1 mingguan), J2 BLN (juara 2
 * bulanan). Teks lengkapnya ada di tooltip.
 */
export default function MarathonWinnerBadge({
  rank,
  period,
  className = "",
}: {
  rank: number;
  period?: "weekly" | "monthly" | null;
  className?: string;
}) {
  const monthly = period === "monthly";
  const Icon = monthly ? FaCrown : FaTrophy;

  return (
    <span
      className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase leading-none tracking-wider ${
        monthly
          ? "bg-amber-400 text-amber-950 shadow-[0_1px_4px_rgba(251,191,36,0.5)]"
          : "bg-sky-400 text-sky-950 shadow-[0_1px_4px_rgba(56,189,248,0.5)]"
      } ${className}`}
      title={`Juara ${rank} Marathon Reading ${monthly ? "Bulanan" : "Mingguan"}`}
    >
      <Icon size={7} className="shrink-0" />
      J{rank} {monthly ? "BLN" : "MGG"}
    </span>
  );
}
