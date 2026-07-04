"use client";

/**
 * RyuTopupBanner
 * Banner promosi RyuTopup (partner top-up game) — disesuaikan dengan tema Ryukomik
 * Menggunakan variabel CSS tema agar kompatibel dengan berbagai tema warna Ryukomik.
 */

import Image from "next/image";

interface RyuTopupBannerProps {
  className?: string;
}

export default function RyuTopupBanner({ className = "" }: RyuTopupBannerProps) {
  return (
    <div className="p-3 sm:px-6">
      <a
        href="https://ryutopup.web.id/"
        target="_blank"
        rel="noopener noreferrer"
        className={`group relative block overflow-hidden rounded-3xl border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--background)] via-[var(--surface-0)] to-[var(--surface-1)] px-5 py-4 sm:px-6 transition-all duration-300 hover:border-[var(--accent)]/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] ${className}`}
      >
        {/* bolt watermark */}
        <svg
          className="pointer-events-none absolute -right-7 -top-5 h-56 w-56 opacity-10 transition-transform duration-500 group-hover:scale-110"
          viewBox="0 0 260 260"
        >
          <defs>
            <linearGradient id="rtBoltGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe066" />
              <stop offset="1" stopColor="#ff8c00" />
            </linearGradient>
          </defs>
          <path
            d="M150 0 L60 140 L120 140 L80 260 L210 100 L140 100 Z"
            fill="url(#rtBoltGrad)"
          />
        </svg>

        {/* sponsor tag, biar jelas ini partner bukan konten Ryukomik */}
        <span className="absolute right-3.5 top-2.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/15 px-2 py-0.5 text-[9.5px] font-semibold tracking-wide text-[var(--accent-2)]">
          OFFICIAL
        </span>

        <div className="relative flex flex-wrap items-center justify-between gap-4 pr-1">
          {/* Logo + wordmark */}
          <div className="flex min-w-[160px] items-center gap-2.5">
            <div className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[11px] border border-white/10 bg-black">
              <Image
                src="/ryutopup-logo.png"
                alt="RyuTopup"
                width={24}
                height={24}
                className="h-6 w-6 object-contain"
              />
            </div>
            <div>
              <div
                className="text-[14px] font-bold leading-tight tracking-wide text-white"
                style={{ fontFamily: "'Orbitron', sans-serif" }}
              >
                RYUTOPUP
              </div>
              <div className="mt-0.5 text-[10.5px] text-[var(--muted)]">
                Top up game partner
              </div>
            </div>
          </div>

          {/* Copy */}
          <div className="min-w-[210px] flex-1">
            <div
              className="text-[16.5px] font-bold leading-snug text-white"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Top up diamond &amp; UC, harga termurah
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {["⚡ Instan", "QRIS & e-wallet", "CS 24 jam"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-2.5 py-[3px] text-[11px] text-[var(--accent-2)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex-shrink-0 whitespace-nowrap rounded-[10px] bg-gradient-to-r from-[#ffd93d] to-[#ff8c00] px-[18px] py-[10px] text-[13px] font-bold text-[#3a2200] transition-transform duration-300 group-hover:scale-105">
            Top Up Sekarang →
          </div>
        </div>
      </a>
    </div>
  );
}
