"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "ryukomik_age_verified";

/**
 * Gerbang 18+ untuk section dewasa di /tonton.
 * Konten baru dirender setelah tombol ditekan (sekali per sesi browser).
 */
export default function AdultGate({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    setVerified(sessionStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const confirm = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVerified(true);
  };

  if (verified === null) {
    return <div className="mx-5 h-40 animate-pulse rounded-2xl bg-white/5" />;
  }

  if (verified) return <>{children}</>;

  return (
    <div className="mx-5 rounded-2xl border border-rose-500/25 bg-rose-500/[.06] p-6 text-center">
      <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-black text-rose-300">
        18+
      </span>
      <p className="mt-3 text-sm font-bold text-white">Konten dewasa</p>
      <p className="mt-1 text-[11px] leading-relaxed text-white/50">
        Section ini berisi anime dewasa. Pastikan kamu berusia 18 tahun ke atas dan menonton di lingkungan yang sesuai.
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={confirm}
          className="rounded-xl bg-rose-500 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-white transition hover:bg-rose-400"
        >
          Saya 18+, lanjut
        </button>
        <Link
          href="/anime/terbaru"
          className="rounded-xl border border-white/10 px-4 py-2 text-[11px] font-bold text-white/60 transition hover:text-white"
        >
          Batal
        </Link>
      </div>
    </div>
  );
}
