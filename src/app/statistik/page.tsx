"use client";

import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import StatsPanel from "@/components/stats/StatsPanel";

/** Statistik bacaan — dipindah dari Komunitas ke Setting → Akun. */
export default function StatistikPage() {
  return (
    <main className="rk-page min-h-screen px-4 pb-24 pt-20 text-white">
      <div className="rk-shell max-w-2xl">
        <div className="mb-4 flex items-center gap-2">
          <Link
            href="/setting"
            aria-label="Kembali ke setting"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[.08] text-white/60 transition-colors hover:bg-white/[.04] hover:text-white"
          >
            <FiArrowLeft size={15} />
          </Link>
          <div>
            <h1 className="text-[15px] font-black leading-tight">Statistik</h1>
            <p className="text-[11px] text-white/40">Bacaan, streak, dan aktivitasmu.</p>
          </div>
        </div>

        <StatsPanel />
      </div>
    </main>
  );
}
