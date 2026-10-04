"use client";

import Image from "next/image";
import Link from "next/link";

export default function PremiumBanner() {
  return (
    <section data-no-tap className="mx-auto my-7 w-full max-w-[760px]" aria-label="Promo Ryukomik Premium">
      <Link
        href="/premium"
        onClick={(event) => event.stopPropagation()}
        aria-label="Lihat paket Ryukomik Premium"
        className="group block overflow-hidden rounded-xl border border-violet-300/20 bg-[#0a0912] shadow-[0_18px_50px_rgba(0,0,0,.4)] transition-transform duration-300 hover:scale-[1.01] sm:rounded-2xl"
      >
        <Image
          src="/premium-promo.webp"
          alt="Ryukomik Premium: baca lebih nyaman, akses chapter premium, dan dukung Ryukomik. Mulai 10 ribu rupiah per bulan."
          width={1254}
          height={1254}
          sizes="(max-width: 760px) 100vw, 760px"
          loading="lazy"
          className="block h-auto w-full"
        />
      </Link>
    </section>
  );
}
