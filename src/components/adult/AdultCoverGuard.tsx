"use client";

import { useState, type ReactNode } from "react";
import { FiEyeOff } from "react-icons/fi";

type Props = {
  adult?: boolean;
  children: ReactNode;
  className?: string;
};

export default function AdultCoverGuard({ adult = false, children, className = "" }: Props) {
  const [revealed, setRevealed] = useState(false);

  if (!adult || revealed) return <>{children}</>;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <div className="h-full w-full scale-[1.04] blur-xl brightness-[.42]" aria-hidden="true">{children}</div>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setRevealed(true);
        }}
        className="absolute inset-0 z-10 flex min-h-10 flex-col items-center justify-center gap-1 bg-black/25 px-2 text-center text-white"
        aria-label="Tampilkan cover konten 18+"
      >
        <FiEyeOff size={18} />
        <span className="text-[11px] font-black">18+</span>
        <span className="text-[9px] font-semibold text-white/65">Ketuk untuk lihat</span>
      </button>
    </div>
  );
}
