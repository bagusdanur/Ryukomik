"use client";

/**
 * RyuTopupBanner (compact)
 * Banner promosi RyuTopup — versi diperkecil biar nggak makan terlalu banyak
 * ruang sebelum konten utama (Fresh Chapter).
 */

import Image from "next/image";

interface RyuTopupBannerProps {
  className?: string;
}

export default function RyuTopupBanner({ className = "" }: RyuTopupBannerProps) {
  return (
    <div className="px-3 pt-2 pb-1 sm:px-6">
      <a
        href="https://ryutopup.web.id/"
        target="_blank"
        rel="noopener noreferrer"
        className={`group relative block overflow-hidden rounded-2xl border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--background)] via-[var(--surface-0)] to-[var(--surface-1)] px-4 py-3 transition-all duration-300 hover:border-[var(--accent)]/50 ${className}`}
      >
        {/* bolt watermark */}
        <svg
          className="pointer-events-none absolute -right-5 -top-3 h-32 w-32 opacity-10 transition-transform duration-500 group-hover:scale-110"
          viewBox="0 0 260 260"
        >
          <defs>
            <linearGradient id="rtBoltGradSm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe066" />
              <stop offset="1" stopColor="#ff8c00" />
            </linearGradient>
          </defs>
          <path
            d="M150 0 L60 140 L120 140 L80 260 L210 100 L140 100 Z"
            fill="url(#rtBoltGradSm)"
          />
        </svg>

        <div className="relative flex flex-wrap items-center gap-3">
          {/* Logo + wordmark + badge (semua inline, tidak ada yang absolute) */}
          <div className="flex min-w-[130px] items-center gap-2">
            <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[8px] border border-white/10 bg-black">
              <Image
                src="/ryutopup-logo.png"
                alt="RyuTopup"
                width={17}
                height={17}
                className="h-[17px] w-[17px] object-contain"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[12px] font-bold leading-tight tracking-wide text-white"
                style={{ fontFamily: "'Orbitron', sans-serif" }}
              >
                RYUTOPUP
              </span>
              <span className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/15 px-1.5 py-[1px] text-[8px] font-semibold tracking-wide text-[var(--accent-2)]">
                OFFICIAL
              </span>
            </div>
          </div>

          {/* Copy */}
          <div className="min-w-[160px] flex-1">
            <div
              className="text-[13px] font-bold leading-snug text-white"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Top up diamond &amp; UC, harga termurah
            </div>
            <div className="mt-1 hidden flex-wrap gap-1 sm:flex">
              {["⚡ Instan", "QRIS & e-wallet", "CS 24 jam"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-2 py-[2px] text-[9.5px] text-[var(--accent-2)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex-shrink-0 whitespace-nowrap rounded-lg bg-gradient-to-r from-[#ffd93d] to-[#ff8c00] px-3 py-2 text-[11.5px] font-bold text-[#3a2200] transition-transform duration-300 group-hover:scale-105">
            Top Up →
          </div>
        </div>
      </a>
    </div>
  );
}