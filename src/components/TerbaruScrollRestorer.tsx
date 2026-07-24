"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const ANCHOR_CACHE_KEY = "rk_terbaru_anchor_v1";
const SCROLL_CACHE_KEY = "rk_terbaru_scroll_v1";

type SavedAnchor = {
  id: string;
  viewportTop: number;
  scrollY: number;
};

export default function TerbaruScrollRestorer() {
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    const previousPath = previousPathRef.current;
    previousPathRef.current = pathname;

    const returnsFromDetail =
      previousPath?.startsWith("/komik/") || previousPath?.startsWith("/novel/");
    if (pathname !== "/terbaru" || !returnsFromDetail) return;

    let savedAnchor: SavedAnchor | null = null;
    let savedScrollY: number | null = null;
    try {
      const rawAnchor = sessionStorage.getItem(ANCHOR_CACHE_KEY);
      const rawScroll = sessionStorage.getItem(SCROLL_CACHE_KEY);
      if (rawAnchor) savedAnchor = JSON.parse(rawAnchor) as SavedAnchor;
      if (rawScroll) savedScrollY = Number(rawScroll);
    } catch {
      return;
    }

    let frameId = 0;
    let attempts = 0;
    let alignedFrames = 0;

    const restore = () => {
      attempts += 1;
      const element = savedAnchor
        ? document.getElementById(savedAnchor.id)
        : null;

      if (element && savedAnchor) {
        const delta =
          element.getBoundingClientRect().top - savedAnchor.viewportTop;
        if (Math.abs(delta) > 1) {
          window.scrollBy({ top: delta, behavior: "instant" });
          alignedFrames = 0;
        } else {
          alignedFrames += 1;
        }
      } else if (savedScrollY !== null) {
        window.scrollTo({ top: savedScrollY, behavior: "instant" });
      }

      if (attempts < 120 && alignedFrames < 12) {
        frameId = requestAnimationFrame(restore);
      }
    };

    frameId = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frameId);
  }, [pathname]);

  return null;
}
