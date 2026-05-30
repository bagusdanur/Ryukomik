"use client"
import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";

const BOTTOM_ZONE = 0.35; // 35% bawah

interface UseTapScrollArgs {
  tapScrollAmount: number;
  isAutoScrolling: boolean;
  stopAutoScroll: () => void;
  setShowUI: Dispatch<SetStateAction<boolean>>;
}

export function useTapScroll({ tapScrollAmount, isAutoScrolling, stopAutoScroll, setShowUI }: UseTapScrollArgs) {
  const [tapHint, setTapHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("button") || target?.closest("[data-no-tap]")) return;

      const tapY = "touches" in e ? e.touches?.[0]?.clientY : e.clientY;
      if (typeof tapY !== "number") return;
      const screenH = window.innerHeight;

      if (tapY > screenH * (1 - BOTTOM_ZONE)) {
        if (isAutoScrolling) { stopAutoScroll(); return; }
        window.scrollBy({ top: tapScrollAmount, behavior: "smooth" });
        setTapHint(true);
        if (hintTimer.current) clearTimeout(hintTimer.current);
        hintTimer.current = setTimeout(() => setTapHint(false), 400);
      } else {
        setShowUI((v) => !v);
      }
    },
    [tapScrollAmount, isAutoScrolling, stopAutoScroll, setShowUI],
  );

  return { handleTap, tapHint };
}
