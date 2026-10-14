"use client";

import { useEffect } from "react";
import { FiRefreshCw, FiHome } from "react-icons/fi";

/**
 * Error boundary per-segment. Menangkap crash runtime di dalam route tree
 * supaya user melihat halaman branding, bukan layar error Next.js polos.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // placeholder untuk integrasi monitoring (Sentry dsb) bila dibutuhkan
    console.error(error);
  }, [error]);

  return (
    <main className="rk-page flex min-h-dvh flex-col items-center justify-center px-6 text-center text-white">
      <p className="text-6xl font-black text-red-300/80 sm:text-7xl">!</p>
      <h1 className="mt-4 text-xl font-black sm:text-2xl">Terjadi kesalahan</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-white/45">
        Halaman ini gagal dimuat. Coba muat ulang, atau kembali ke beranda kalau masih error.
      </p>
      {error.digest && <p className="mt-3 text-[10px] text-white/25">Kode: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button onClick={reset} className="flex items-center gap-2 rounded-full bg-[var(--accent-2)] px-5 py-2.5 text-sm font-black text-black transition hover:brightness-110">
          <FiRefreshCw /> Coba lagi
        </button>
        <a href="/" className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-black text-white/80 transition hover:bg-white/[0.06]">
          <FiHome /> Beranda
        </a>
      </div>
    </main>
  );
}
