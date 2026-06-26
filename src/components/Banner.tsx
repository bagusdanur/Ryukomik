"use client";

import dynamic from "next/dynamic";

type BannerItem = {
  image: string;
  title?: string;
  genre?: string;
  slug: string;
};

const SwiperCarousel = dynamic(() => import("./SwiperCarousel"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] sm:h-[380px] md:h-[460px] rounded-2xl border border-white/[0.08] bg-[color:color-mix(in_srgb,var(--surface-2)_82%,var(--surface-1))] animate-pulse" />
  ),
});

export default function Banner({ data }: { data?: BannerItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="rk-state mx-3 mt-16 flex h-56 items-center justify-center rounded-2xl text-sm">
        Tidak ada spotlight
      </div>
    );
  }

  return (
    <section className="w-full px-3 pt-16 md:px-0 md:pt-20">
      <SwiperCarousel data={data} />
    </section>
  );
}
