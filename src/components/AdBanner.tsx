"use client";

import { useEffect, useState } from "react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import Link from "next/link";
import { FaBan, FaStar, FaTimes } from "react-icons/fa";

const STORAGE_KEY = "adBannerDismissedSession";

export default function AdBanner() {
  const { loading: premLoading, isPremium } = usePremiumStatus();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!sessionStorage.getItem(STORAGE_KEY)) {
        setShow(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const closeForSession = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  if (premLoading || isPremium) return null;
  if (!show) return null;

  return (
    <div className="fixed bottom-14 inset-x-0 z-[9999] flex justify-center px-3">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#111116]">
        <div className="absolute inset-x-0 top-0 h-px bg-sky-300/40" />

        <div className="relative flex items-center gap-3 px-3.5 py-3.5 pr-10 sm:gap-3.5 sm:px-4 sm:pr-11">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10 text-sky-300 sm:h-11 sm:w-11">
            <FaBan />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5">
              <h3 className="truncate text-[12px] font-bold text-white sm:text-[13px]">
                Tanpa Iklan
              </h3>
              <span className="shrink-0 rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                Pro
              </span>
            </div>
            <p className="line-clamp-2 text-[11px] leading-snug text-white/55">
              Hilangkan banner iklan saat baca dan dukung Ryukomik tetap jalan.
            </p>
          </div>

          <Link
            href="/premium"
            className="flex shrink-0 items-center gap-1 rounded-xl bg-[var(--accent-2)] px-2.5 py-2 text-[10px] font-bold text-[#071018] hover:bg-sky-300 sm:gap-1.5 sm:px-3 sm:text-[11px]"
          >
            <FaStar className="text-[12px]" />
            <span className="hidden min-[380px]:inline">Tanpa Iklan</span>
            <span className="min-[380px]:hidden">Premium</span>
          </Link>
        </div>

        <button
          type="button"
          onClick={closeForSession}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-white/35 hover:bg-white/10 hover:text-white/80"
          aria-label="Tutup banner premium untuk sesi ini"
          title="Tutup untuk sesi ini"
        >
          <FaTimes className="text-[11px]" />
        </button>
      </div>
    </div>
  );
}
