import React, { memo } from "react";

// Cover komik populer & project bawaan Ryukomik (resolusi ringan ~150-200px, terkompresi webp)
export const DEFAULT_MARQUEE_COVERS: string[][] = [
  // Kolom 1
  [
    "https://storage.ryukomik.my.id/covers/is-it-bad-that-the-main-character-s-a-roleplayer/cover.webp",
    "https://storage.ryukomik.my.id/covers/beast-saga/cover.webp",
    "https://storage.ryukomik.my.id/covers/let-s-do-it-after-work/cover.jpg",
  ],
  // Kolom 2
  [
    "https://storage.ryukomik.my.id/covers/get-out/cover.jpg",
    "https://storage.ryukomik.my.id/covers/affair-agency/cover.webp",
    "https://storage.ryukomik.my.id/covers/i-m-the-hero-but-the-main-heroines-are-trying-to-kill-me/cover.webp",
  ],
  // Kolom 3
  [
    "https://storage.ryukomik.my.id/covers/sicario/cover.png",
    "https://storage.ryukomik.my.id/covers/the-old-man-vows-revenge-against-his-demon-wife/cover.png",
    "https://storage.ryukomik.my.id/covers/rebirth-of-the-immortal-supreme-in-the-city/cover.png",
  ],
];

interface MarqueeCoverGridProps {
  opacity?: number;
  tiltAngle?: number; // default -10 deg
  scale?: number;     // default 1.15
  className?: string;
  overlayGradient?: string;
}

const columnAnimations = [
  "animate-marquee-up",
  "animate-marquee-down",
  "animate-marquee-up-slow",
  "animate-marquee-down-slow",
];

export const MarqueeCoverGrid = memo(function MarqueeCoverGrid({
  opacity = 0.28,
  tiltAngle = -10,
  scale = 1.18,
  className = "",
  overlayGradient,
}: MarqueeCoverGridProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {/* 1. Rotated Multi-Column Grid */}
      <div
        className="absolute -inset-x-12 -inset-y-24 flex justify-center gap-3 sm:gap-4 md:gap-5"
        style={{
          transform: `rotate(${tiltAngle}deg) scale(${scale}) translateZ(0)`,
          transformOrigin: "center center",
          opacity,
        }}
      >
        {DEFAULT_MARQUEE_COVERS.map((column, colIdx) => {
          const animClass = columnAnimations[colIdx % columnAnimations.length];
          // Duplicate items to create seamless infinite vertical loop
          const loopItems = [...column, ...column];

          return (
            <div
              key={colIdx}
              className={`flex flex-col gap-3 sm:gap-4 w-24 sm:w-28 md:w-32 flex-shrink-0 ${animClass}`}
            >
              {loopItems.map((imgSrc, itemIdx) => (
                <div
                  key={itemIdx}
                  className="aspect-[2/3] w-full overflow-hidden rounded-xl bg-slate-900 shadow-md shadow-black/60 border border-white/5"
                >
                  <img
                    src={imgSrc}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* 2. Seamless Full Fade Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            overlayGradient ||
            `linear-gradient(to bottom, rgba(10, 11, 18, 0.4) 0%, rgba(10, 11, 18, 0.75) 45%, rgba(10, 11, 18, 0.98) 85%, rgba(10, 11, 18, 1) 100%)`,
        }}
      />
    </div>
  );
});

export default MarqueeCoverGrid;
