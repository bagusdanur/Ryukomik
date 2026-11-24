"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FiClock, FiLock, FiPlay, FiShield } from "react-icons/fi";

import { usePremiumStatus } from "@/hooks/usePremiumStatus";

/**
 * Gerbang iklan berkala.
 *
 * Setiap 10 menit (dan sekali di awal kunjungan) pengguna non-premium melihat
 * modal dengan dua pilihan: buka tautan sponsor untuk bebas iklan 10 menit,
 * atau berlangganan premium tanpa iklan sama sekali.
 *
 * Iklan popunder otomatis sudah dicabut — pengunjung sekarang tahu apa yang
 * mereka "bayar" dan mendapat imbalan waktu bebas iklan.
 */
const AD_LINK = "https://uplcm.com/4/10352759";
const FREE_WINDOW_MS = 10 * 60 * 1000;
const FIRST_SHOW_DELAY_MS = 30 * 1000;
const POLL_MS = 10 * 1000;
import { AD_FREE_STORAGE_KEY } from "@/lib/adFreeWindow";

const STORAGE_KEY = AD_FREE_STORAGE_KEY;

const SKIP_PREFIXES = ["/dashboard", "/premium", "/topup", "/auth", "/api", "/info/domain-baru"];

function readUntil(): number {
  try {
    return Number(window.localStorage.getItem(STORAGE_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

export default function AdGate() {
  const pathname = usePathname();
  const { isPremium, loading } = usePremiumStatus();
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState(0);

  const skip = SKIP_PREFIXES.some((prefix) => (pathname || "").startsWith(prefix));

  // Tampilkan modal ketika masa bebas iklan habis.
  useEffect(() => {
    if (loading || isPremium || skip) {
      setOpen(false);
      return;
    }

    const check = () => {
      const until = readUntil();
      const left = until - Date.now();
      setRemaining(left > 0 ? left : 0);
      if (left <= 0) setOpen(true);
    };

    const first = window.setTimeout(check, FIRST_SHOW_DELAY_MS);
    const poll = window.setInterval(check, POLL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(poll);
    };
  }, [loading, isPremium, skip]);

  const grantFreeWindow = useCallback(() => {
    // window.open di dalam handler klik tidak diblokir popup blocker.
    window.open(AD_LINK, "_blank", "noopener,noreferrer");
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now() + FREE_WINDOW_MS));
    } catch {
      /* storage diblokir: modal akan muncul lagi, tapi situs tetap jalan */
    }
    setRemaining(FREE_WINDOW_MS);
    setOpen(false);
  }, []);

  if (!open) return null;

  const minutes = Math.max(1, Math.round(FREE_WINDOW_MS / 60000));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="adgate-title"
      className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
    >
      <div className="rk-card w-full max-w-sm rounded-3xl border border-white/[.08] p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/12 text-amber-300 ring-1 ring-amber-300/25">
          <FiShield size={20} />
        </span>

        <h2 id="adgate-title" className="mt-4 text-lg font-black leading-tight text-white">
          Baca gratis, server tetap hidup
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-white/60">
          Ryukomik tidak memungut biaya. Pilih salah satu untuk lanjut membaca —
          cukup sekali setiap {minutes} menit.
        </p>

        <button
          type="button"
          onClick={grantFreeWindow}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent-2)] px-4 py-3 text-sm font-black text-black transition hover:brightness-110 active:scale-[.99]"
        >
          <FiPlay size={15} />
          Bebas iklan {minutes} menit
        </button>

        <Link
          href="/premium-pay"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-white/85 transition hover:bg-white/[.06]"
        >
          <FiLock size={14} />
          Premium tanpa iklan
        </Link>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[10.5px] text-white/35">
          <FiClock size={11} />
          {remaining > 0
            ? `Bebas iklan aktif ${Math.ceil(remaining / 60000)} menit lagi`
            : "Menunggu pilihanmu"}
        </p>
      </div>
    </div>
  );
}
