"use client";

import { FaDiscord, FaWhatsapp } from "react-icons/fa";
import { FiUsers } from "react-icons/fi";

/**
 * Banner komunitas — grup WhatsApp + Discord Ryukomik.
 * Link memakai yang sudah dipakai di seluruh situs, tidak ada yang baru.
 */

const WHATSAPP = "https://chat.whatsapp.com/JJjlXcgdm90H5qNaJiXPDV";
const DISCORD = "https://discord.gg/Sf8pPRq4aj";

export default function CommunityBanner({ className = "" }: { className?: string }) {
  return (
    <section
      data-no-tap
      className={`mx-auto mb-8 w-full max-w-[760px] px-3 sm:px-4 ${className}`}
      aria-label="Komunitas Ryukomik"
    >
      <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-1)] p-4 sm:p-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-2)]/30 bg-[var(--accent-2)]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--accent-2)]">
          <FiUsers size={10} /> Komunitas
        </span>

        <h2 className="mt-2 text-[15px] font-black leading-tight text-white sm:text-[16px]">
          Gabung ke komunitas Ryukomik
        </h2>

        <p className="mt-1 text-[12px] leading-relaxed text-white/55">
          Diskusi chapter baru, info rilis, dan bantuan akun — langsung dari pembaca lain.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-[12px] font-black text-white transition hover:bg-emerald-500 active:scale-[0.98]"
          >
            <FaWhatsapp size={15} /> Gabung WhatsApp
          </a>
          <a
            href={DISCORD}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-4 text-[12px] font-black text-white transition hover:brightness-110 active:scale-[0.98]"
          >
            <FaDiscord size={15} /> Gabung Discord
          </a>
        </div>
      </div>
    </section>
  );
}
