import type { ReactNode } from "react";

interface NavBtnProps {
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export default function NavBtn({ icon, onClick, disabled = false, className = "" }: NavBtnProps) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[var(--surface-1)] text-white transition-all hover:border-white/30 hover:bg-[var(--surface-2)] active:scale-95 disabled:pointer-events-none disabled:opacity-40 sm:h-12 sm:w-12 ${className}`}
    >
      {icon}
    </button>
  );
}
