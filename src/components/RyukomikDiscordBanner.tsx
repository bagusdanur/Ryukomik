"use client";

import Link from "next/link";
import { FaDiscord } from "react-icons/fa";
import { FiUploadCloud } from "react-icons/fi";
import MarathonBanner from "@/components/MarathonBanner";

/**
 * Baris kartu di beranda: ajakan unggah karya Scanlator + Marathon Reading.
 *
 * Mobile: kartu Scanlator penuh selebar layar (teks besar & tombol lega),
 * Marathon di bawahnya. Tablet ke atas: dua kolom sejajar.
 */

const DISCORD_HELP = "https://discord.gg/Sf8pPRq4aj";

export default function RyukomikScanlatorBanner({ className = "" }: { className?: string }) {
  return (
    <div className={`px-3 pb-1 pt-2 sm:px-6 ${className}`}>
      <div className="grid grid-cols-1 items-stretch gap-2.5 sm:grid-cols-2 sm:gap-3">
        {/* Scanlator — kartu utama */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface-1)] p-4 sm:p-3">
          <span
            className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[var(--accent)]/20 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/15 text-[var(--accent-2)]">
              <FiUploadCloud size={15} />
            </span>
            <span className="min-w-0 truncate text-[9px] font-black uppercase tracking-[0.14em] text-[var(--accent-2)]">
              Scanlator
            </span>
            <span className="ml-auto shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-emerald-300">
              Gratis
            </span>
          </div>

          <p className="relative mt-2.5 text-[15px] font-black leading-snug text-white sm:text-[13px]">
            Unggah karya terjemahanmu
          </p>

          <p className="relative mt-1 text-[11.5px] leading-relaxed text-white/55 sm:text-[10.5px]">
            Nama tim tampil di setiap chapter, karya tetap milikmu.
          </p>

          <div className="relative mt-3 flex items-center gap-2">
            <Link
              href="/scanlator/daftar"
              className="flex h-10 flex-1 items-center justify-center rounded-xl bg-[var(--accent)] text-[12.5px] font-black text-white transition active:scale-[0.98] sm:h-8 sm:text-[10px]"
            >
              Upload Karya
            </Link>
            <a
              href={DISCORD_HELP}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bantuan upload via Discord"
              className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--line-soft)] px-3 text-[11px] font-bold text-white/70 transition hover:text-white sm:h-8 sm:text-[10px]"
            >
              <FaDiscord size={12} /> Bantuan
            </a>
          </div>
        </div>

        {/* Marathon Reading */}
        <MarathonBanner />
      </div>
    </div>
  );
}
