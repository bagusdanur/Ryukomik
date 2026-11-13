"use client";

import Link from "next/link";
import { FiArrowRight, FiAlertCircle, FiUploadCloud } from "react-icons/fi";

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
      id="pemberitahuan-scanlator"
      className={`mx-auto my-7 w-full max-w-[760px] px-3 sm:px-4 ${className}`}
      aria-label="Pemberitahuan untuk translator dan tim scanlator"
    >
      <div className="relative overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-1)]">
        <span className="absolute inset-y-0 left-0 w-1 bg-[var(--accent)]" aria-hidden="true" />

        <div className="p-4 pl-5 sm:p-5 sm:pl-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-[0.16em] text-[var(--accent-2)]">
            <FiUploadCloud size={11} /> Pemberitahuan
          </span>

          <h2 className="mt-2.5 text-[18px] font-black leading-tight text-white sm:text-[19px]">
            Untuk Translator &amp; Tim Scanlator
          </h2>

          <p className="mt-2 text-[13.5px] leading-relaxed text-white/65 sm:text-[13.5px]">
            Punya hasil terjemahan sendiri? Unggah karyamu ke{" "}
            <b className="font-extrabold text-white">Ryukomik Studio</b> — gratis, nama tim kamu tampil di
            setiap chapter, dan karya tetap milikmu.
          </p>

          <p className="mt-3 flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 text-[12.5px] leading-relaxed text-rose-200">
            <FiAlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>
              <b className="font-extrabold">Akun error saat mau upload?</b> Coba masuk ulang sekali lagi. Kalau
              masih bermasalah, lapor ke kami — kami bantu sampai kamu bisa upload.
            </span>
          </p>

          <div className="mt-3.5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/scanlator/daftar"
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 text-[13px] font-black text-white transition active:scale-[0.98]"
            >
              Upload Karya <FiArrowRight size={15} />
            </Link>
            <a
              href={DISCORD_HELP}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--line-soft)] bg-[var(--surface-2)] px-4 text-[13px] font-bold text-white/75 transition hover:text-white active:scale-[0.98]"
            >
              Lapor via Discord
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
