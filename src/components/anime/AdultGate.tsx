"use client";

import { useEffect, useState } from "react";

const VERIFIED_KEY = "ryukomik_age_verified";
const HIDDEN_KEY = "ryukomik_adult_section_hidden";

/**
 * Gerbang 18+ untuk section dewasa di /tonton.
 * - "Saya 18+, lanjut" → konten dirender (sekali per sesi).
 * - "Batal" → seluruh section disembunyikan (termasuk judulnya) sampai sesi
 *   browser direset, jadi tidak ada konten dewasa yang tersisa di halaman.
 */
export default function AdultGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "verified" | "hidden" | "ask">("loading");

  useEffect(() => {
    if (sessionStorage.getItem(HIDDEN_KEY) === "1") setState("hidden");
    else if (sessionStorage.getItem(VERIFIED_KEY) === "1") setState("verified");
    else setState("ask");
  }, []);

  const confirm = () => {
    sessionStorage.setItem(VERIFIED_KEY, "1");
    setState("verified");
  };

  const dismiss = () => {
    sessionStorage.setItem(HIDDEN_KEY, "1");
    setState("hidden");
  };

  if (state === "loading") {
    return <div className="mx-5 h-40 animate-pulse rounded-2xl bg-white/5" />;
  }

  if (state === "hidden") return null;
  if (state === "verified") return <>{children}</>;

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
        <button
          type="button"
          onClick={dismiss}
          className="rounded-xl border border-white/10 px-4 py-2 text-[11px] font-bold text-white/60 transition hover:border-white/25 hover:text-white"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
