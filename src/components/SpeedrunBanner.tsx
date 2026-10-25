"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiArrowRight, FiClock } from "react-icons/fi";
import { RiFlashlightFill } from "react-icons/ri";

/**
 * Banner event pengganti slot iklan di homepage.
 * Hitung mundur ke Senin 00:00 WIB (akhir periode mingguan).
 */
function nextWeekEnd(now = new Date()): number {
  const WIB = 7 * 60 * 60 * 1000;
  const wib = new Date(now.getTime() + WIB);
  const day = wib.getUTCDay() || 7; // Senin = 1 … Minggu = 7
  const daysToMonday = 8 - day;
  return Date.UTC(
    wib.getUTCFullYear(),
    wib.getUTCMonth(),
    wib.getUTCDate() + daysToMonday,
  ) - WIB;
}

function useCountdown() {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, nextWeekEnd() - Date.now()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (left === null) return null;
  const totalMinutes = Math.floor(left / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}h ${hours}j`;
  if (hours > 0) return `${hours}j ${minutes}m`;
  return `${minutes} menit`;
}

const PRIZES = [
  { medal: "🥇", label: "30 hari" },
  { medal: "🥈", label: "14 hari" },
  { medal: "🥉", label: "7 hari" },
];

export default function SpeedrunBanner() {
  const countdown = useCountdown();

  return (
    <Link
      href="/marathon"
      className="group relative mx-3 mb-3 block overflow-hidden rounded-2xl border border-amber-400/25 bg-[var(--surface-1)] transition-colors hover:border-amber-400/45 sm:mx-0"
    >
      {/* glow */}
      <span className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-amber-400/15 blur-3xl" />
      <span className="pointer-events-none absolute -left-8 -bottom-16 h-32 w-32 rounded-full bg-rose-500/10 blur-3xl" />

      <div className="relative flex items-center gap-3 px-3.5 py-3 sm:px-4">
        {/* icon */}
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-amber-950 shadow-[0_2px_12px_rgba(251,191,36,0.35)]">
          <RiFlashlightFill size={20} />
        </span>

        {/* copy */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-300">
              Event · Speedrun Baca
            </span>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-px text-[8px] font-black uppercase tracking-wider text-emerald-300">
              Live
            </span>
          </div>
          <p className="mt-0.5 truncate text-[13px] font-extrabold text-white sm:text-sm">
            Baca terbanyak, juara 1-3 dapat Premium
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {PRIZES.map((p) => (
              <span
                key={p.medal}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/25 px-1.5 py-px text-[9px] font-bold text-white/60"
              >
                <span aria-hidden>{p.medal}</span>
                {p.label}
              </span>
            ))}
            {countdown && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white/35">
                <FiClock size={9} /> sisa {countdown}
              </span>
            )}
          </div>
        </div>

        {/* cta */}
        <span className="flex shrink-0 items-center gap-1 rounded-xl border border-amber-400/25 bg-amber-400/10 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-amber-200 transition-colors group-hover:bg-amber-400/20 sm:text-[11px]">
          Ikuti
          <FiArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
