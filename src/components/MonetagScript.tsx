"use client";

import { useEffect } from "react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

type PublicAdProvider = {
  id: string;
  enabled: boolean;
  scriptUrl: string;
  zoneId: string | null;
  imageUrl: string | null;
  targetUrl: string | null;
};

type PublicAdsConfig = {
  masterEnabled: boolean;
  providers: PublicAdProvider[];
};

const PROVIDER_ATTR = "data-ad-provider";

function cleanupAds() {
  document
    .querySelectorAll(`script[${PROVIDER_ATTR}]`)
    .forEach((el) => el.remove());
  document
    .querySelectorAll(`iframe[${PROVIDER_ATTR}]`)
    .forEach((el) => el.remove());
  document
    .querySelectorAll(`div[${PROVIDER_ATTR}], ins[${PROVIDER_ATTR}]`)
    .forEach((el) => el.remove());
}

function mountAds(config: PublicAdsConfig) {
  if (typeof document === "undefined") return;

  if (!config.masterEnabled) {
    cleanupAds();
    return;
  }

  const target = [document.body, document.documentElement].filter(Boolean).pop();
  if (!target) return;

  const activeIds = new Set<string>();

  for (const provider of config.providers) {
    if (!provider.enabled || !provider.scriptUrl) continue;
    activeIds.add(provider.id);

    // Cegah script ganda (navigasi Next.js / re-mount).
    const existing = document.querySelector(
      `script[${PROVIDER_ATTR}="${provider.id}"]`,
    );
    if (existing) continue;

    const script = document.createElement("script");
    script.src = provider.scriptUrl;
    script.async = true;
    script.setAttribute(PROVIDER_ATTR, provider.id);
    // data-cfasync="false" → cegah Cloudflare Rocket Loader merusak script iklan
    script.setAttribute("data-cfasync", "false");
    if (provider.zoneId) script.dataset.zone = provider.zoneId;
    target.appendChild(script);
  }

  // Hapus provider yang sudah dimatikan / di-remove dari config.
  document.querySelectorAll(`script[${PROVIDER_ATTR}]`).forEach((el) => {
    const id = el.getAttribute(PROVIDER_ATTR);
    if (id && !activeIds.has(id)) el.remove();
  });
}

export default function MonetagScript() {
  const { loading, isPremium } = usePremiumStatus();

  // Bersihkan semua trace iklan jika user premium.
  useEffect(() => {
    if (loading || !isPremium) return;

    let idleId: number | null = null;
    const cleanup = () => cleanupAds();

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(cleanup);
    } else {
      const t = setTimeout(cleanup, 100);
      return () => clearTimeout(t);
    }

    return () => {
      if (idleId && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [loading, isPremium]);

  // Pasang iklan setelah status premium diketahui & config diambil.
  useEffect(() => {
    if (loading || isPremium) return;

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/ads-config", { cache: "no-store" });
        if (!res.ok) return;
        const config = (await res.json()) as PublicAdsConfig;
        if (cancelled) return;
        if (!config?.masterEnabled) {
          cleanupAds();
          return;
        }
        mountAds(config);
      } catch {
        // Diamkan — iklan gagal load tidak boleh mengganggu halaman.
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [loading, isPremium]);

  return null;
}
