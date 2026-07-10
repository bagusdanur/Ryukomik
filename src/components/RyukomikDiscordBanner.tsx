"use client";

import { useState } from "react";
import { FaDiscord, FaPen, FaPalette } from "react-icons/fa";

/**
 * RyukomikStaffRecruitmentBanner (compact, mobile-first)
 * Banner rekrutmen staff Ryukomik — gaya & ukuran mengikuti RyukomikDiscordBanner.
 * Alur pendaftaran (7 langkah) ditampilkan lewat popup agar tidak memaksa banner melebar.
 */

const STEPS = [
  { n: "01", text: 'Klik tombol "Buat Tiket Pendaftaran" di channel #staff-rekrutmen' },
  { n: "02", text: "Jawab 3 pertanyaan awal dari Bot" },
  { n: "03", text: 'Klik tombol "Ambil Tes TL" atau "Ambil Tes TS"' },
  { n: "04", text: "Download bahan tes dari link yang diberikan Bot" },
  { n: "05", text: "Kerjakan sesuai instruksi" },
  { n: "06", text: "Kirim hasil di tiket Discord kamu" },
  { n: "07", text: "Tim Admin akan review & menghubungi kamu!" },
];

const POSITIONS = [
  { icon: FaPen, role: "Translator (TL)", desc: "English → Indonesia" },
  { icon: FaPalette, role: "Typesetter (TS)", desc: "Cleaning, Redrawing & Typesetting" },
];

const DISCORD_INVITE = "https://discord.gg/Sf8pPRq4aj";

export default function RyukomikStaffRecruitmentBanner({ className = "" }) {
  const [showSteps, setShowSteps] = useState(false);

  return (
    <div className={`px-3 pt-2 pb-1 sm:px-6 ${className}`}>
      <div
        className={`group relative overflow-hidden rounded-2xl border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--background)] via-[var(--surface-0)] to-[var(--surface-1)] px-4 py-3 transition-all duration-300 hover:border-[var(--accent)]/50`}
      >
        {/* watermark icon */}
        <FaDiscord
          className="pointer-events-none absolute -right-5 -top-3 h-32 w-32 opacity-10 transition-transform duration-500 group-hover:scale-110 text-[var(--accent)]"
        />

        <div className="relative flex flex-wrap items-center gap-3">
          {/* Logo + wordmark + badge */}
          <div className="flex min-w-[130px] items-center gap-2">
            <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[8px] border border-white/10 bg-black">
              <FaDiscord className="h-[16px] w-[16px] text-[var(--accent-2)]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[12px] font-bold leading-tight tracking-wide text-white"
                style={{ fontFamily: "'Orbitron', sans-serif" }}
              >
                RYUKOMIK
              </span>
              <span className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/15 px-1.5 py-[1px] text-[8px] font-semibold tracking-wide text-[var(--accent-2)]">
                STAFF RECRUITMENT
              </span>
            </div>
          </div>

          {/* Copy */}
          <div className="min-w-[160px] flex-1">
            <div
              className="text-[13px] font-bold leading-snug text-white"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Gabung Tim Scanlation Ryukomik!
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {POSITIONS.map((p) => {
                const Icon = p.icon;
                return (
                  <span
                    key={p.role}
                    className="flex items-center gap-1.5 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-2 py-[2px] text-[9.5px] text-[var(--accent-2)]"
                  >
                    <Icon className="h-[11px] w-[11px] flex-shrink-0" />
                    <span>{p.role}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSteps(true)}
              className="whitespace-nowrap rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2 text-[11.5px] font-bold text-[var(--accent-2)] transition-colors hover:bg-[var(--accent)]/20"
            >
              Lihat Alur
            </button>
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] px-3 py-2 text-[11.5px] font-bold text-white transition-transform duration-300 hover:scale-105"
            >
              Gabung →
            </a>
          </div>
        </div>
      </div>

      {/* POPUP: alur pendaftaran */}
      {showSteps && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setShowSteps(false)}
        >
          <div
            className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-[var(--accent)]/30 bg-[var(--surface-1)] p-5 sm:max-w-md sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowSteps(false)}
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-[13px] text-[var(--muted)] hover:bg-white/5"
              aria-label="Tutup"
            >
              ✕
            </button>

            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-2)]">
              Alur Pendaftaran
            </div>
            <h2
              className="mb-4 text-[18px] font-extrabold text-white"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              7 Langkah Menuju Tim Ryukomik
            </h2>

            <div className="flex flex-col gap-3.5">
              {STEPS.map((s, idx) => (
                <div key={s.n} className="relative flex gap-3">
                  {idx < STEPS.length - 1 && (
                    <div className="absolute left-[13px] top-7 h-[calc(100%+2px)] w-px bg-[var(--accent)]/25" />
                  )}
                  <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      idx === 0
                        ? "bg-[var(--accent)] text-white"
                        : idx === STEPS.length - 1
                        ? "bg-[var(--accent-3)] text-white"
                        : "border border-[var(--accent)]/40 bg-[var(--surface-2)] text-[var(--accent-2)]"
                    }`}
                  >
                    {s.n}
                  </div>
                  <p className="pt-0.5 text-[13px] leading-snug text-[#d8d3ee]">{s.text}</p>
                </div>
              ))}
            </div>

            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] px-4 py-3 text-[13px] font-bold text-white transition-transform hover:scale-[1.02]"
            >
              <FaDiscord className="h-4 w-4" />
              Buat Tiket di Discord
            </a>
          </div>
        </div>
      )}
    </div>
  );
}