"use client";

import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import Image from "next/image";

import "swiper/css";
import "swiper/css/pagination";

type BannerItem = {
  image: string;
  title?: string;
  genre?: string;
  slug: string;
};

export default function SwiperCarousel({ data }: { data: BannerItem[] }) {
  return (
    <Swiper
      modules={[Autoplay, Pagination]}
      autoplay={{ delay: 4500, disableOnInteraction: false }}
      pagination={{ clickable: true }}
      loop
      className="h-[300px] overflow-hidden rounded-2xl border border-white/[0.08] sm:h-[380px] md:h-[460px]"
    >
      {data.map((item, index) => {
        const img = item.image.split("?")[0];

        return (
          <SwiperSlide key={`${item.slug}-${index}`}>
            <div className="relative h-full w-full bg-[var(--surface-0)]">
              <Image
                src={img}
                alt={item.title || "Spotlight"}
                referrerPolicy="no-referrer"
                priority={index === 0}
                sizes="(max-width: 768px) 100vw, 1180px"
                className="absolute inset-0 h-full w-full"
                fill
                style={{ objectFit: "cover" }}
              />
              <div className="absolute inset-0 bg-[var(--background)]/72" />

              <div className="absolute bottom-0 left-0 w-full p-4 pb-9 sm:p-6 md:p-9 md:pb-12">
                <span className="rk-chip inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase">
                  Spotlight
                </span>

                <h2 className="mt-3 max-w-2xl text-2xl font-black leading-tight text-white line-clamp-2 md:text-4xl">
                  {item.title}
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-6 text-white/70 line-clamp-2">
                  {item.genre}
                </p>

                <Link
                  prefetch={false}
                  href={`/komik/kiryuu/${item.slug}`}
                  className="rk-btn-primary mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold"
                >
                  Baca Sekarang
                </Link>
              </div>
            </div>
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
}
