"use client";

import Link from "next/link";
import { FaDiscord } from "react-icons/fa";
import { FiUploadCloud } from "react-icons/fi";
import MarathonBanner from "@/components/MarathonBanner";

/**
 * Baris dua kartu di beranda: ajakan unggah karya Scanlator + Marathon Reading.
 *
 * Kartu rekrutmen staff "Translator & Typesetter" (dibayar) sudah dihapus —
 * diganti ajakan unggah karya sendiri lewat Ryukomik Studio.
 */

const DISCORD_HELP = "https://discord.gg/Sf8pPRq4aj";

export default function RyukomikScanlatorBanner({ className = "" }: { className?: string }) {
  return (
    <div className={`px-3 pb-1 pt-2 sm:px-6 ${className}`}>
      <div className="grid grid-cols-2 items-stretch gap-2 sm:gap-3">
        {/* Scanlator */}
        <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--accent)]/25 bg-[var(--surface-1)] p-2.5 transition-colors hover:border-[var(--accent)]/45">
          <FiUploadCloud className="pointer-events-none absolute -right-4 -top-5 h-20 w-20 text-[var(--accent)] opacity-[0.07]" />

          <div className="relative flex items-center gap-1.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[var(--accent)]/25 bg-[var(--accent)]/12 text-[var(--accent-2)]">
              <FiUploadCloud size={11} />
            </span>
            <span className="min-w-0 truncate text-[8px] font-black uppercase tracking-[0.1em] text-[var(--accent-2)]">
              Scanlator
            </span>
            <span className="ml-auto shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1 py-px text-[7px] font-black uppercase tracking-wide text-emerald-300">
              Gratis
            </span>
          </div>

          <p className="relative mt-1.5 text-[11px] font-extrabold leading-tight text-white">
            Unggah karya terjemahanmu
          </p>

          <div className="relative mt-1.5 flex flex-wrap items-center gap-1">
            {["Nama tim tampil", "Karya tetap milikmu"].map((label) => (
              <span
                key={label}
                className="inline-flex items-center rounded-full bg-white/[0.05] px-1.5 py-0.5 text-[8px] font-bold text-white/60"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="relative mt-auto flex items-center gap-1.5 pt-2">
            <Link
              href="/scanlator/daftar"
              className="flex-1 rounded-lg bg-[var(--accent)] px-2 py-1.5 text-center text-[9.5px] font-black text-white transition-transform active:scale-95"
            >
              Upload
            </Link>
            <a
              href={DISCORD_HELP}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bantuan upload via Discord"
              className="shrink-0 rounded-lg border border-white/10 px-2 py-1.5 text-white/55 transition-colors hover:text-white/85"
            >
              <FaDiscord size={10} />
            </a>
          </div>
        </div>

        {/* Marathon Reading */}
        <MarathonBanner />
      </div>
    </div>
  );
}
