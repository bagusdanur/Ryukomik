"use client";

import { useEffect } from "react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const RAJAAPK_SCRIPT_URL = "https://gaslah.my.id/aan/siap/1788017146215-rajaapk.js";

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
      document.querySelectorAll(`script[src="${RAJAAPK_SCRIPT_URL}"]`).forEach((el) => el.remove());
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

  // Load script iklan secara dinamis setelah status Premium diketahui.
  useEffect(() => {
    if (loading || isPremium) return;

    const monetagScript = document.createElement("script");
    monetagScript.dataset.zone = "10944835";
    monetagScript.src = "https://al5sm.com/tag.min.js";
    monetagScript.async = true;

    const rajaApkScript = document.createElement("script");
    rajaApkScript.src = RAJAAPK_SCRIPT_URL;
    rajaApkScript.async = true;

    const target = [document.documentElement, document.body].filter(Boolean).pop();
    if (target) {
      target.append(monetagScript, rajaApkScript);
    }

    return () => {
      monetagScript.remove();
      rajaApkScript.remove();
    };
  }, [loading, isPremium]);

  return null;
}
