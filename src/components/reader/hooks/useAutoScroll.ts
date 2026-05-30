"use client"
import { useCallback, useEffect, useRef, useState } from "react";

export function useAutoScroll(scrollSpeed: number) {
  const [active, setActive] = useState(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      window.scrollBy(0, scrollSpeed / 2);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [active, scrollSpeed]);

  const toggle = useCallback(() => setActive((v) => !v), []);
  const stop   = useCallback(() => setActive(false), []);

  return { active, toggle, stop };
}
