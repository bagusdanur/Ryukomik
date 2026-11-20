"use client";

import Link from "next/link";
import { FiArrowRight, FiAlertCircle, FiUploadCloud } from "react-icons/fi";
import { FaDiscord } from "react-icons/fa";

/**
 * Pemberitahuan untuk translator & tim scanlator — ajakan mengunggah karya
 * ke Ryukomik Studio, plus bantuan kalau akun bermasalah.
 *
 * Ditampilkan di akhir chapter (pengganti banner rekrutmen berbasis gambar).
 */

const DISCORD_HELP = "https://discord.gg/Sf8pPRq4aj";

export default function ScanlatorNoticeBanner({ className = "" }: { className?: string }) {
  return (
    <section
      data-no-tap
      className={`mx-auto my-5 w-full max-w-[760px] px-3 sm:px-4 ${className}`}
      aria-label="Pemberitahuan untuk translator dan tim scanlator"
    >
      <div className="rk-card rounded-3xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent-2)]">
            <FiUploadCloud size={20} />
          </span>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent-2)]">
              Pemberitahuan
            </span>
            <h2 className="mt-0.5 text-[16px] font-black leading-tight text-white sm:text-[17px]">
              Untuk Translator &amp; Tim Scanlator
            </h2>
          </div>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-white/65 sm:text-[14px]">
          Punya hasil terjemahan sendiri? Unggah ke{" "}
          <b className="font-extrabold text-white">Ryukomik Studio</b> — gratis, nama tim tampil di
          setiap chapter, dan karya tetap milikmu.
        </p>

        <p className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2.5 text-[12px] leading-relaxed text-rose-200/90">
          <FiAlertCircle size={14} className="mt-0.5 shrink-0 text-rose-300" />
          <span>
            <b className="font-extrabold text-rose-200">Akun error saat upload?</b> Coba masuk ulang sekali.
            Kalau masih bermasalah, lapor ke kami — kami bantu sampai bisa upload.
          </span>
        </p>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href="/scanlator/daftar"
            className="rk-btn-primary flex h-14 items-center justify-center gap-2 rounded-2xl px-4 text-[14px] font-black shadow-[0_8px_24px_-10px_var(--accent)] sm:h-12 sm:flex-1"
          >
            Upload Karya <FiArrowRight size={17} />
          </Link>
          <a
            href={DISCORD_HELP}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-2)] px-4 text-[13px] font-bold text-white/80 transition hover:border-white/20 hover:bg-white/5 hover:text-white active:scale-[0.98] sm:h-12 sm:flex-1"
          >
            <FaDiscord size={17} className="text-[#8b96f5]" /> Lapor via Discord
          </a>
        </div>
      </div>
    </section>
  );
}
