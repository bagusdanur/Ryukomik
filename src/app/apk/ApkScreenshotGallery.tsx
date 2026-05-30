"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";

type ApkScreenshotGalleryProps = {
  screenshots: string[];
};

export default function ApkScreenshotGallery({
  screenshots,
}: ApkScreenshotGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const close = useCallback(() => setActiveIndex(null), []);
  const showPrevious = useCallback(() => {
    setActiveIndex((current) =>
      current === null
        ? current
        : (current - 1 + screenshots.length) % screenshots.length,
    );
  }, [screenshots.length]);
  const showNext = useCallback(() => {
    setActiveIndex((current) =>
      current === null ? current : (current + 1) % screenshots.length,
    );
  }, [screenshots.length]);

  useEffect(() => {
    if (activeIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, close, showNext, showPrevious]);

  return (
    <>
      <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-5 sm:gap-4">
        {screenshots.map((src, index) => (
          <button
            type="button"
            className="relative aspect-[9/16] h-[360px] max-h-[62vh] w-[72vw] max-w-[260px] shrink-0 snap-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] text-left shadow-lg shadow-black/20 transition active:scale-[0.99] sm:h-[520px] sm:w-[292px] sm:max-w-none"
            key={src}
            onClick={() => setActiveIndex(index)}
            aria-label={`Buka screenshot Ryukomik ${index + 1}`}
          >
            <Image
              src={src}
              alt={`Screenshot Ryukomik ${index + 1}`}
              fill
              sizes="(max-width: 640px) 72vw, 292px"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {activeIndex !== null && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Preview screenshot Ryukomik"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={close}
            aria-label="Tutup preview"
          />

          <button
            type="button"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur transition hover:bg-white/15"
            onClick={close}
            aria-label="Tutup"
          >
            <FiX aria-hidden="true" className="h-5 w-5" />
          </button>

          <button
            type="button"
            className="absolute left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur transition hover:bg-white/15 sm:left-6"
            onClick={showPrevious}
            aria-label="Screenshot sebelumnya"
          >
            <FiChevronLeft aria-hidden="true" className="h-6 w-6" />
          </button>

          <div className="relative z-10 aspect-[9/16] h-full max-h-[86vh] w-auto max-w-[92vw] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/50">
            <Image
              src={screenshots[activeIndex]}
              alt={`Screenshot Ryukomik ${activeIndex + 1}`}
              fill
              sizes="92vw"
              className="object-contain"
              priority
            />
          </div>

          <button
            type="button"
            className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur transition hover:bg-white/15 sm:right-6"
            onClick={showNext}
            aria-label="Screenshot berikutnya"
          >
            <FiChevronRight aria-hidden="true" className="h-6 w-6" />
          </button>

          <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-2">
            {screenshots.map((src, index) => (
              <button
                type="button"
                className={`h-2 rounded-full transition ${
                  index === activeIndex
                    ? "w-6 bg-[var(--accent)]"
                    : "w-2 bg-white/35"
                }`}
                key={src}
                onClick={() => setActiveIndex(index)}
                aria-label={`Lihat screenshot ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
