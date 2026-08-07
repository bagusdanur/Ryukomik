"use client";

import Image from "next/image";

const DISCORD_RECRUITMENT_URL = "https://discord.gg/Cy8cuhknac";

export default function RecruitmentBanner() {
  return (
    <section data-no-tap className="mx-auto my-7 w-full max-w-[760px]" aria-label="Promo komunitas Ryukomik">
      <a
        href={DISCORD_RECRUITMENT_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        aria-label="Gabung Discord Ryukomik untuk recruitment translator dan typesetter"
        className="group block overflow-hidden rounded-xl border border-violet-300/20 bg-[#0a0912] shadow-[0_18px_50px_rgba(0,0,0,.4)] transition-transform duration-300 hover:scale-[1.01] sm:rounded-2xl"
      >
        <Image
          src="/recruitment-banner.jpg"
          alt="Ryukomik membuka recruitment Translator dan Typesetter. Klik untuk daftar via Discord."
          width={1280}
          height={1280}
          sizes="(max-width: 760px) 100vw, 760px"
          loading="lazy"
          className="block h-auto w-full"
        />
      </a>
    </section>
  );
}
