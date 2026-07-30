"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FaTelegramPlane } from "react-icons/fa";
import { FiChevronLeft, FiChevronRight, FiShield, FiUsers, FiZap } from "react-icons/fi";

const DISCORD_RECRUITMENT_URL = "https://discord.gg/Cy8cuhknac";
const ANON_RPG_URL = "https://t.me/anonrpg_bot?start=ryukomik_chapter";
const TOTAL_SLIDES = 2;

export default function RecruitmentBanner() {
  // Tampilkan promo baru terlebih dahulu; recruitment Discord tetap slide berikutnya.
  const [activeSlide, setActiveSlide] = useState(1);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % TOTAL_SLIDES);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  const previous = () => setActiveSlide((current) => (current + TOTAL_SLIDES - 1) % TOTAL_SLIDES);
  const next = () => setActiveSlide((current) => (current + 1) % TOTAL_SLIDES);

  return (
    <section data-no-tap className="mx-auto my-7 w-full max-w-[760px]" aria-label="Promo komunitas Ryukomik">
      <div className="relative overflow-hidden rounded-xl border border-violet-300/20 bg-[#0a0912] shadow-[0_18px_50px_rgba(0,0,0,.4)] sm:rounded-2xl">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        >
          <a
            href={DISCORD_RECRUITMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            aria-label="Gabung Discord Ryukomik untuk recruitment translator dan typesetter"
            className="group block w-full shrink-0"
          >
            <Image
              src="/recruitment-banner.jpg"
              alt="Ryukomik membuka recruitment Translator dan Typesetter. Klik untuk daftar via Discord."
              width={1280}
              height={1280}
              sizes="(max-width: 760px) 100vw, 760px"
              loading="lazy"
              className="block h-auto w-full transition duration-300 group-hover:scale-[1.01]"
            />
          </a>

          <a
            href={ANON_RPG_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            aria-label="Buka Anon RPG Bot di Telegram"
            className="group relative flex aspect-square w-full shrink-0 overflow-hidden bg-[#090a18] p-5 sm:p-8"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(118,80,255,.42),transparent_30%),radial-gradient(circle_at_70%_82%,rgba(31,210,255,.22),transparent_33%),linear-gradient(135deg,#080914_0%,#151031_54%,#091624_100%)]" />
            <div className="absolute -right-16 top-1/4 h-72 w-72 rounded-full border border-violet-300/15 bg-violet-400/10 blur-[1px]" />
            <div className="absolute -right-4 bottom-4 h-44 w-44 rounded-full border border-cyan-300/20 bg-cyan-300/10" />
            <div className="absolute right-[21%] top-[17%] h-3 w-3 rounded-full bg-cyan-200 shadow-[0_0_24px_7px_rgba(103,232,249,.55)]" />
            <div className="absolute right-[11%] top-[41%] h-2 w-2 rounded-full bg-violet-200 shadow-[0_0_18px_5px_rgba(196,181,253,.55)]" />
            <div className="absolute right-[31%] bottom-[16%] h-2 w-2 rounded-full bg-cyan-100 shadow-[0_0_18px_5px_rgba(165,243,252,.55)]" />

            <div className="relative z-10 flex max-w-[72%] flex-col justify-between text-left">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black tracking-[.16em] text-cyan-100">
                  <FaTelegramPlane size={13} /> ANONYMOUS DUO RPG
                </div>
                <h2 className="text-2xl font-black leading-[1.05] tracking-tight text-white sm:text-4xl">
                  Ngobrol.<br />
                  <span className="bg-gradient-to-r from-cyan-200 to-violet-300 bg-clip-text text-transparent">Match.</span><br />
                  Taklukkan dungeon.
                </h2>
                <p className="mt-4 text-xs leading-relaxed text-white/70 sm:text-sm">
                  Cari partner anonim, bentuk party rahasia, lalu main RPG turn-based bersama.
                </p>
              </div>

              <div>
                <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-bold text-white/75">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2.5 py-1"><FiShield size={11} /> Identitas aman</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2.5 py-1"><FiUsers size={11} /> Co-op turn-based</span>
                </div>
                <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2.5 text-xs font-black text-[#080914] shadow-lg shadow-cyan-400/20 transition group-hover:scale-[1.03] sm:text-sm">
                  <FaTelegramPlane size={15} /> Buka @anonrpg_bot
                </span>
              </div>
            </div>

            <div className="absolute bottom-[13%] right-[7%] z-10 flex h-36 w-28 rotate-[9deg] items-center justify-center rounded-[2rem] border border-violet-200/30 bg-gradient-to-b from-violet-300/30 to-[#151530]/70 shadow-[0_0_45px_rgba(132,94,247,.35)] sm:h-52 sm:w-40">
              <FiZap className="text-cyan-100 drop-shadow-[0_0_18px_rgba(103,232,249,.7)]" size={64} />
            </div>
          </a>
        </div>

        <button onClick={previous} aria-label="Slide sebelumnya" className="absolute left-2 top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/35 text-white/80 backdrop-blur transition hover:bg-black/65 sm:left-3 sm:h-9 sm:w-9"><FiChevronLeft size={17} /></button>
        <button onClick={next} aria-label="Slide berikutnya" className="absolute right-2 top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/35 text-white/80 backdrop-blur transition hover:bg-black/65 sm:right-3 sm:h-9 sm:w-9"><FiChevronRight size={17} /></button>

        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 rounded-full border border-white/10 bg-black/35 px-2 py-1.5 backdrop-blur">
          {Array.from({ length: TOTAL_SLIDES }, (_, index) => (
            <button key={index} onClick={() => setActiveSlide(index)} aria-label={`Buka slide ${index + 1}`} className={`h-1.5 rounded-full transition-all ${activeSlide === index ? "w-5 bg-cyan-200" : "w-1.5 bg-white/45 hover:bg-white/80"}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
