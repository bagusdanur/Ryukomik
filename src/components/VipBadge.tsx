import { FaCrown } from "react-icons/fa";

export default function VipBadge({ className = "" }: { className?: string }) {
  return (
    <span
      style={{ "--rk-badge-shine-delay": "0s" } as React.CSSProperties}
      className={`rk-badge-premium inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/40 bg-gradient-to-r from-[var(--accent)]/35 via-fuchsia-400/20 to-[var(--accent)]/35 px-2 py-0.5 text-[9px] font-black uppercase leading-none tracking-widest text-white shadow-[0_0_10px_-2px_var(--accent)] ${className}`}
    >
      <FaCrown size={8} className="shrink-0 text-amber-300" />
      VIP
    </span>
  );
}
