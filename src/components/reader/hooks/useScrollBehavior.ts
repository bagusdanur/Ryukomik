"use client"
import { useEffect, useRef } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

interface UseScrollBehaviorArgs {
  autoNext: boolean;
  nextSlug?: string;
  source: string;
  router: AppRouterInstance;
  slugStr: string;
  onScrollDown: () => void;
  onStopAutoScroll: () => void;
}

export function useScrollBehavior({
  autoNext,
  nextSlug,
  source,
  router,
  slugStr,
  onScrollDown,
  onStopAutoScroll,
}: UseScrollBehaviorArgs) {
  const lastScroll       = useRef(0);
  const scrollTriggered  = useRef(false);

  useEffect(() => {
    scrollTriggered.current = false;
  }, [slugStr]);

  useEffect(() => {
    const handleScroll = () => {
      const cur = window.scrollY;
      if (cur > lastScroll.current && cur > 100) onScrollDown();
      lastScroll.current = cur;

      const atBottom =
        window.innerHeight + cur >= document.documentElement.scrollHeight - 150;

      if (autoNext && nextSlug && atBottom && !scrollTriggered.current) {
        scrollTriggered.current = true;
        router.push(
          nextSlug.startsWith("chapter/")
            ? `/${nextSlug}`
            : `/chapter/${source}/${nextSlug}`,
        );
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [autoNext, nextSlug, source, router, onScrollDown]);

  // Stop auto scroll saat user manual scroll / touch
  useEffect(() => {
    window.addEventListener("wheel",      onStopAutoScroll);
    window.addEventListener("touchstart", onStopAutoScroll);
    return () => {
      window.removeEventListener("wheel",      onStopAutoScroll);
      window.removeEventListener("touchstart", onStopAutoScroll);
    };
  }, [onStopAutoScroll]);
}
