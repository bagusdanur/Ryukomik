"use client";

import { useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { AD_FREE_STORAGE_KEY } from "@/lib/adFreeWindow";

const ZONE = "12328480";
const SRC = "https://al5sm.com/tag.min.js";
const PROVIDER_ATTR = "data-ad-provider";
const PROVIDER_ID = "al5sm-v1";
const CHECK_MS = 15 * 1000;

function adFreeUntil(): number {
  try {
    return Number(window.localStorage.getItem(AD_FREE_STORAGE_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

/**
 * Iklan popunder al5sm HANYA untuk deployment SFW (v1.ryukomik.com).
 *
 * Script dipasang/dilepas mengikuti gate yang sama dengan AdGate:
 *  - tidak dipasang untuk premium
 *  - tidak dipasang selama jendela "Bebas iklan 10 menit" aktif
 *  - dipasang ulang otomatis setelah cooldown habis
 *
 * Menulis penanda `data-ad-provider` supaya cleanupAds() di MonetagScript
 * tidak menganggapnya sebagai script asing, dan script tidak dihapus-pasang
 * ulang tiap render.
 */
export default function SfwAdScript() {
  const pathname = usePathname();
  const { isPremium, loading } = usePremiumStatus();
  const skip = ["/premium", "/topup", "/dashboard", "/auth"].some((p) =>
    (pathname || "").startsWith(p),
  );

  const sync = useCallback(() => {
    if (loading || isPremium || skip) return;
    const until = adFreeUntil();
    const allowed = until <= Date.now();
    const existing = document.querySelector(`script[${PROVIDER_ATTR}="${PROVIDER_ID}"]`);

    if (!allowed) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return; // sudah terpasang, jangan duplikat

    const script = document.createElement("script");
    script.setAttribute(PROVIDER_ATTR, PROVIDER_ID);
    script.dataset.zone = ZONE;
    script.src = SRC;
    script.async = true;
    document.body.appendChild(script);
  }, [loading, isPremium, skip]);

  useEffect(() => {
    if (loading || isPremium || skip) {
      document.querySelector(`script[${PROVIDER_ATTR}="${PROVIDER_ID}"]`)?.remove();
      return;
    }
    sync();
    const timer = window.setInterval(sync, CHECK_MS);
    const onFocus = () => sync();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [loading, isPremium, skip, sync]);

  return null;
}
