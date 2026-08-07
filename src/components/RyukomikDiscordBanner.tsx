"use client";

import { useState } from "react";
import { FaBolt, FaDiscord, FaPen, FaPalette, FaUsers } from "react-icons/fa";

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
  { icon: FaPen, role: "Translator (TL)" },
  { icon: FaPalette, role: "Typesetter (TS)" },
];

const DISCORD_INVITE = "https://discord.gg/Sf8pPRq4aj";

export default function RyukomikStaffRecruitmentBanner({
  className = "",
}) {
  const [showSteps, setShowSteps] = useState(false);

  return (
    <div className={`px-3 pb-1 pt-2 sm:px-6 ${className}`}>
      <div className="relative overflow-hidden rounded-2xl border border-[var(--accent)]/25 bg-[var(--surface-1)] transition-colors hover:border-[var(--accent)]/45">
        <div className="rk-card group relative flex w-full items-center gap-2.5 overflow-hidden px-3 py-3 sm:px-4">
          <FaDiscord className="pointer-events-none absolute -right-3 -top-4 h-24 w-24 text-[var(--accent)] opacity-[0.08]" />
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent-2)]">
            <FaDiscord className="h-4 w-4" />
          </div>
          <div className="relative min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.12em] text-[var(--accent-2)]"><FaBolt className="text-[8px]" /> Urgent recruitment</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-1.5 py-0.5 text-[8px] font-black text-[var(--accent-2)]"><FaUsers className="text-[8px]" /> Semua posisi dibayar</span>
            </div>
            <p className="mt-0.5 truncate text-[12px] font-extrabold text-white sm:text-[13px]">Ryukomik butuh Translator & Typesetter</p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {POSITIONS.map((position) => {
                const Icon = position.icon;
                return <span key={position.role} className="inline-flex items-center gap-1 rounded-full bg-white/[0.045] px-1.5 py-0.5 text-[8.5px] font-semibold text-white/65"><Icon className="text-[9px] text-[var(--accent-2)]" />{position.role}</span>;
              })}
              <button type="button" onClick={() => setShowSteps(true)} className="px-1 text-[9px] font-bold text-[var(--accent-2)] hover:underline">Lihat alur</button>
            </div>
          </div>
          <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="rk-btn-primary relative shrink-0 whitespace-nowrap rounded-xl px-2.5 py-2 text-[10px] font-bold text-white transition-transform active:scale-95 sm:px-3 sm:text-[11px]">Gabung</a>
        </div>
      </div>

      {showSteps && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setShowSteps(false)}
        >
          <div
            className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-[var(--accent)]/30 bg-[var(--surface-1)] p-5 sm:max-w-md sm:rounded-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowSteps(false)}
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-[13px] text-[var(--muted)] hover:bg-white/5"
              aria-label="Tutup"
            >
              ×
            </button>

            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-2)]">
              Alur Pendaftaran
            </div>
            <h2 className="mb-1 text-[18px] font-extrabold text-white">
              7 Langkah Menuju Tim Ryukomik
            </h2>
            <p className="mb-4 text-[11px] font-bold text-[var(--accent-2)]">
              Semua posisi dibayar.
            </p>

            <div className="flex flex-col gap-3.5">
              {STEPS.map((step, index) => (
                <div key={step.n} className="relative flex gap-3">
                  {index < STEPS.length - 1 && (
                    <div className="absolute left-[13px] top-7 h-[calc(100%+2px)] w-px bg-[var(--accent)]/25" />
                  )}
                  <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      index === 0
                        ? "bg-[var(--accent)] text-white"
                        : index === STEPS.length - 1
                          ? "bg-[var(--accent-3)] text-white"
                          : "border border-[var(--accent)]/40 bg-[var(--surface-2)] text-[var(--accent-2)]"
                    }`}
                  >
                    {step.n}
                  </div>
                  <p className="pt-0.5 text-[13px] leading-snug text-white/80">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>

            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="rk-btn-primary mt-5 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-bold text-white transition-transform hover:scale-[1.02]"
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
