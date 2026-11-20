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
      <div className="rk-card rounded-3xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--accent-2)_18%,transparent)] text-[var(--accent-2)]">
            <FiUsers size={20} />
          </span>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent-2)]">
              Komunitas
            </span>
            <h2 className="mt-0.5 text-[16px] font-black leading-tight text-white sm:text-[17px]">
              Gabung ke komunitas Ryukomik
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-white/60">
              Diskusi chapter baru, info rilis, dan bantuan akun — langsung dari pembaca lain.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-[14px] font-black text-white shadow-[0_8px_24px_-10px_rgb(5_150_105)] transition hover:bg-emerald-500 active:scale-[0.98] sm:h-12 sm:flex-1"
          >
            <FaWhatsapp size={18} /> Gabung WhatsApp
          </a>
          <a
            href={DISCORD}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#5865F2] px-4 text-[14px] font-black text-white shadow-[0_8px_24px_-10px_#5865F2] transition hover:brightness-110 active:scale-[0.98] sm:h-12 sm:flex-1"
          >
            <FaDiscord size={18} /> Gabung Discord
          </a>
        </div>
      </div>
    </section>
  );
}
