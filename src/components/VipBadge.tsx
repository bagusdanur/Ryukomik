import { FaCrown } from "react-icons/fa";

export default function VipBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black uppercase leading-none tracking-widest text-amber-950 shadow-[0_1px_4px_rgba(251,191,36,0.5)] ${className}`}
    >
      <FaCrown size={8} className="shrink-0" />
      VIP
    </span>
  );
}
