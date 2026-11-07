"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FiEyeOff } from "react-icons/fi";

type Props = {
  adult?: boolean;
  revealKey?: string;
  children: ReactNode;
  className?: string;
};

const revealStorageKey = (key: string) => "rk-adult-cover-reveal:" + key + ":" + new Date().toLocaleDateString("en-CA");

function wasRevealedToday(key?: string): boolean {
  if (!key) return false;
  try {
    const stored = localStorage.getItem(revealStorageKey(key));
    return stored !== null && Number(stored) > Date.now();
  } catch {
    return false;
  }
}

function rememberRevealToday(key?: string) {
  if (!key) return;
  try {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    localStorage.setItem(revealStorageKey(key), String(midnight.getTime()));
  } catch {}
}

export default function AdultCoverGuard({ adult = false, revealKey, children, className = "" }: Props) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (revealKey && wasRevealedToday(revealKey)) setRevealed(true);
  }, [revealKey]);

  if (!adult || revealed) return <>{children}</>;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <div className="h-full w-full scale-[1.04] blur-xl brightness-[.42]" aria-hidden="true">{children}</div>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          rememberRevealToday(revealKey);
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
