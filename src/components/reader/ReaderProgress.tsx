"use client";
import { useEffect, useState } from "react";

const ACCENT = "var(--accent)";

interface ReaderProgressProps {
  images?: string[];
  slugStr: string;
}

export default function ReaderProgress({ images = [], slugStr }: ReaderProgressProps) {
  const [current, setCurrent] = useState(1);
  const total = images.length;

  useEffect(() => {
    if (!total) return;

    function getCurrentPage() {
      const imgs = document.querySelectorAll<HTMLImageElement>("img[data-page]");
      if (!imgs.length) return;

      const viewportMid = window.innerHeight / 2;
      let closest: HTMLImageElement | null = null;
      let closestDist = Infinity;

      imgs.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const elMid = rect.top + rect.height / 2;
        const dist = Math.abs(elMid - viewportMid);
        if (dist < closestDist) {
          closestDist = dist;
          closest = el;
        }
      });

      if (closest) {
        setCurrent(Number(closest.dataset.page) + 1);
      }
    }

    window.addEventListener("scroll", getCurrentPage, { passive: true });
    // Initial check setelah gambar render
    const t = setTimeout(() => {
      setCurrent(1);
      getCurrentPage();
    }, 600);

    return () => {
      window.removeEventListener("scroll", getCurrentPage);
      clearTimeout(t);
    };
  }, [total, slugStr]);

  if (!total) return null;

  const pct = Math.round((current / total) * 100);

  return (
    <div
      className="fixed bottom-6 right-3 z-10 pointer-events-none flex items-center justify-center"
      style={{
        width: 30,
        height: 30,
        borderRadius: "50%",
        background: "rgba(18,18,18,0.82)",
        
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <span
        style={{
          color: ACCENT,
          fontSize: 10,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {pct}%
      </span>
    </div>
  );
}
