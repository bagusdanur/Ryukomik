import { FaCrown, FaTrophy } from "react-icons/fa";

/**
 * Badge juara Marathon Reading — bentuknya sama dengan badge lain (VIP/ADMIN):
 * pill solid, ikon kecil, huruf kapital rapat. Yang membedakan periode adalah
 * warna dan ikonnya: emas + mahkota untuk bulanan, biru + trofi untuk mingguan.
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
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-black uppercase leading-none tracking-widest shadow-[0_1px_4px_rgba(0,0,0,0.35)] ${
        monthly
          ? "bg-amber-400 text-amber-950 shadow-[0_1px_4px_rgba(251,191,36,0.5)]"
          : "bg-sky-400 text-sky-950 shadow-[0_1px_4px_rgba(56,189,248,0.5)]"
      } ${className}`}
      title={`Juara ${rank} Marathon Reading ${monthly ? "Bulanan" : "Mingguan"}`}
    >
      <Icon size={8} className="shrink-0" />
      Juara {rank} {monthly ? "Bulanan" : "Mingguan"}
    </span>
  );
}
