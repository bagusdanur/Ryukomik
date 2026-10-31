"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

/**
 * Error boundary khusus halaman chapter.
 *
 * Dipakai ketika sumber komik memblokir scraper (403/Cloudflare) atau backend
 * sedang gangguan. Ini BUKAN 404: chapter bisa saja masih ada, jadi pengguna
 * diberi tombol coba lagi alih-alih halaman "tidak ditemukan".
 */
export default function ChapterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[chapter] gagal memuat:", error.message);
  }, [error]);

  const blocked = /blokir|sumber/i.test(error.message);

  return (
    <div className="rk-page flex min-h-[60vh] items-center justify-center px-4 text-white">
      <div className="rk-card w-full max-w-md rounded-2xl p-6 text-center">
        <h1 className="text-lg font-black">
          {blocked ? "Sumber komik sedang diblokir" : "Chapter gagal dimuat"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          {blocked
            ? "Server sumber menolak permintaan sementara. Chapter ini belum tentu hilang — coba lagi beberapa saat."
            : "Terjadi gangguan saat mengambil chapter. Coba muat ulang."}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-black transition hover:bg-cyan-400"
          >
            <RefreshCw size={14} /> Coba lagi
          </button>
          <Link
            href="/"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-white/80 transition hover:text-white"
          >
            Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
