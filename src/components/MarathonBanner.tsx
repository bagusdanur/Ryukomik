"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiClock } from "react-icons/fi";
import { RiFlashlightFill } from "react-icons/ri";

/**
 * Kartu event Marathon Reading untuk homepage (setengah lebar, sejajar kartu rekrutmen).
 * Hitung mundur ke Senin 00:00 WIB — akhir periode mingguan.
 */
function nextWeekEnd(now = new Date()): number {
  const WIB = 7 * 60 * 60 * 1000;
  const wib = new Date(now.getTime() + WIB);
  const day = wib.getUTCDay() || 7; // Senin = 1 … Minggu = 7
  return Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() + (8 - day)) - WIB;
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
  return `${minutes}m`;
}

const PRIZES = ["30", "14", "7"];

export default function MarathonBanner() {
  const countdown = useCountdown();

  return (
    <Link
      href="/marathon"
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-amber-400/25 bg-[var(--surface-1)] p-2.5 transition-colors hover:border-amber-400/45"
    >
      <span className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-amber-400/12 blur-2xl" />

      <div className="relative flex items-center gap-1.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-orange-500 text-amber-950 shadow-[0_2px_10px_rgba(251,191,36,0.3)]">
          <RiFlashlightFill size={11} />
        </span>
        <span className="min-w-0 truncate text-[8px] font-black uppercase tracking-[0.1em] text-amber-300">
          Marathon Reading
        </span>
        <span className="ml-auto shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1 py-px text-[7px] font-black uppercase tracking-wide text-emerald-300">
          Live
        </span>
      </div>

      <p className="relative mt-1.5 text-[11px] font-extrabold leading-tight text-white">
        Juara 1-3 dapat Premium
      </p>

      <div className="relative mt-1.5 flex flex-wrap items-center gap-1">
        {PRIZES.map((days, index) => (
          <span
            key={days}
            className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-1.5 py-0.5 text-[8px] font-bold text-white/60"
          >
            <span aria-hidden>{["🥇", "🥈", "🥉"][index]}</span>
            {days}h
          </span>
        ))}
      </div>

      <div className="relative mt-auto flex items-center justify-between gap-1 pt-2">
        <span className="inline-flex min-w-0 items-center gap-0.5 text-[8.5px] font-bold text-white/35">
          <FiClock size={8} className="shrink-0" />
          <span className="truncate">{countdown ?? "—"}</span>
        </span>
        <span className="shrink-0 text-[9.5px] font-black text-amber-300 transition-transform group-hover:translate-x-0.5">
          Ikuti →
        </span>
      </div>
    </Link>
  );
}
