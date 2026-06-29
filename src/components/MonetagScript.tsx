"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

export default function MonetagScript() {
  const { loading, isPremium } = usePremiumStatus();

  // Aktif bersihkan semua trace Monetag jika user premium
  useEffect(() => {
    if (loading || !isPremium) return;

    let idleId: number | null = null;

    const cleanup = () => {
      // Hapus script tag monetag yang sudah ada
      document.querySelectorAll('script[data-zone]').forEach((el) => el.remove());
      document.querySelectorAll('script[src*="al5sm.com"]').forEach((el) => el.remove());
      // Hapus iframe/div iklan yang mungkin sudah ter-inject
      document.querySelectorAll('iframe[src*="al5sm.com"]').forEach((el) => el.remove());
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(cleanup);
    } else {
      setTimeout(cleanup, 100);
    }

    return () => {
      if (idleId && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [loading, isPremium]);

  // Load script monetag secara dinamis menggunakan useEffect
  useEffect(() => {
    if (loading || isPremium) return;

    const s = document.createElement("script");
    s.dataset.zone = "10944835";
    s.src = "https://al5sm.com/tag.min.js";

    const target = [document.documentElement, document.body].filter(Boolean).pop();
    if (target) {
      target.appendChild(s);
    }

    return () => {
      s.remove();
    };
  }, [loading, isPremium]);

  return null;
}
