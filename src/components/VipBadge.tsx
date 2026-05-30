export default function VipBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/12 px-2 py-0.5 text-[9px] font-black uppercase leading-none tracking-widest text-[var(--accent)] ${className}`}
    >
      VIP
    </span>
  );
}
