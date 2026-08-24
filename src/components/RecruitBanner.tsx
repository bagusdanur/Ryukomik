"use client";

import Link from "next/link";
import { useEffect, useRef, useState, startTransition } from "react";
import {
  FaWhatsapp,
  FaStar,
  FaCoffee,
  FaChevronLeft,
  FaChevronRight,
  FaBan,
  FaGamepad,
  FaBullhorn,
} from "react-icons/fa";
import Button from "@/components/Button";
import type { IconType } from "react-icons";

type SlideIconKey = "ban" | "whatsapp" | "star" | "coffee" | "gamepad" | "bullhorn";

type Slide = {
  iconKey: SlideIconKey;
  iconBg: string;
  iconColor: string;
  title: string;
  badge: { label: string; className: string } | null;
  sub: string;
  btn: {
    label: string;
    href: string;
    external?: boolean;
    className: string;
    iconKey?: SlideIconKey;
  };
};

const SLIDES: Slide[] = [
 
  {
    iconKey: "ban",
    iconBg: "bg-cyan-400/10",
    iconColor: "text-cyan-200",
    title: "Hilangkan Iklan",
    badge: { label: "Premium", className: "bg-violet-500/20 text-violet-200" },
    sub: "Nikmati baca komik tanpa gangguan iklan dengan Premium.",
    btn: {
      label: "Premium",
      href: "/premium-pay",
      className: "rk-btn-primary text-white",
      iconKey: "star",
    },
  },
  {
    iconKey: "whatsapp",
    iconBg: "bg-green-500/20",
    iconColor: "text-green-400",
    title: "Komunitas WA",
    badge: { label: "Gratis", className: "bg-green-500/20 text-green-300" },
    sub: "Gabung grup WhatsApp komunitas Ryukomik sekarang!",
    btn: {
      label: "Join WA",
      href: "https://chat.whatsapp.com/JJjlXcgdm90H5qNaJiXPDV",
      external: true,
      className: "bg-green-700 hover:bg-green-600 text-white",
      iconKey: "whatsapp",
    },
  },
   {
    iconKey: "gamepad",
    iconBg: "bg-cyan-500/20",
    iconColor: "text-cyan-300",
    title: "Ryukomik Games",
    badge: { label: "Baru", className: "bg-cyan-500/20 text-cyan-200" },
    sub: "Main tebak judul komik dari cover HD.",
    btn: {
      label: "Main",
      href: "/game",
      className: "bg-cyan-600 hover:bg-cyan-500 text-white",
      iconKey: "gamepad",
    },
  },
  {
    iconKey: "star",
    iconBg: "bg-violet-500/20",
    iconColor: "text-violet-400",
    title: "Premium",
    badge: { label: "Baru", className: "bg-violet-500/20 text-violet-300" },
    sub: "Akses fitur eksklusif tanpa batas dengan Premium.",
    btn: {
      label: "Premium",
      href: "/premium-pay",
      className: "rk-btn-primary text-white",
    },
  },
  {
    iconKey: "bullhorn",
    iconBg: "bg-orange-500/20",
    iconColor: "text-orange-400",
    title: "Pasang Iklan",
    badge: { label: "Ads", className: "bg-orange-500/20 text-orange-300" },
    sub: "Jangkau ratusan ribu pembaca dengan banner iklan.",
    btn: {
      label: "Pasang",
      href: "/ads",
      className: "bg-orange-600 hover:bg-orange-500 text-white",
      iconKey: "bullhorn",
    },
  },
  {
    iconKey: "coffee",
    iconBg: "bg-yellow-500/20",
    iconColor: "text-yellow-400",
    title: "Dukung Ryukomik",
    badge: null,
    sub: "Traktir kopi biar web terus jalan & diupdate!",
    btn: {
      label: "Donate",
      href: "https://trakteer.id/quartz_square",
      external: true,
      className: "bg-yellow-400 hover:bg-yellow-300 text-black",
      iconKey: "coffee",
    },
  },
];

const ICONS: Record<SlideIconKey, IconType> = {
  ban: FaBan,
  whatsapp: FaWhatsapp,
  star: FaStar,
  coffee: FaCoffee,
  gamepad: FaGamepad,
  bullhorn: FaBullhorn,
};

function Icon({ name }: { name: SlideIconKey }) {
  const Component = ICONS[name];
  return <Component />;
}

export default function RecruitBanner() {
  const [cur, setCur] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const total = SLIDES.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isVisible) return;
    timerRef.current = setInterval(() => {
      startTransition(() => {
        setCur((c) => (c + 1) % total);
      });
    }, 3500);
  };

  const goTo = (n: number) => {
    startTransition(() => {
      setCur(((n % total) + total) % total);
    });
    resetTimer();
  };

  useEffect(() => {
    if (!isVisible) return;
    timerRef.current = setInterval(() => {
      startTransition(() => {
        setCur((c) => (c + 1) % total);
      });
    }, 3500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, isVisible]);

  const slide = SLIDES[cur];

  return (
    <div ref={containerRef} className="p-3 sm:px-6">
      <div
        className="rk-card relative overflow-hidden rounded-3xl"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 40) goTo(cur + (dx < 0 ? 1 : -1));
        }}
      >
        {/* Prev */}
        <Button
          variant="ghost"
          onClick={() => goTo(cur - 1)}
          className="absolute left-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full"
        >
          <FaChevronLeft className="text-[10px]" />
        </Button>

        {/* Next */}
        <Button
          variant="ghost"
          onClick={() => goTo(cur + 1)}
          className="absolute right-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full"
        >
          <FaChevronRight className="text-[10px]" />
        </Button>

        {/* Slide */}
        <div className="relative flex items-center gap-3 px-8 py-4">
          {/* Icon */}
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] text-base ${slide.iconBg} ${slide.iconColor}`}
          >
            <Icon name={slide.iconKey} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <h3 className="flex items-center gap-1.5 truncate text-sm font-bold text-white">
              {slide.title}
              {slide.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${slide.badge.className}`}
                >
                  {slide.badge.label}
                </span>
              )}
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-white/60 line-clamp-2">
              {slide.sub}
            </p>
          </div>

          {/* Button */}
          <div className="flex-shrink-0">
            <Link
                href={slide.btn.href}
                {...(slide.btn.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition ${slide.btn.className}`}
              >
                {slide.btn.iconKey && (
                  <span className="text-sm">
                    <Icon name={slide.btn.iconKey} />
                  </span>
                )}
                {slide.btn.label}
              </Link>
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 pb-2.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-[3px] rounded-full transition-all duration-300 ${
                i === cur ? "w-7 bg-cyan-200" : "w-5 bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
