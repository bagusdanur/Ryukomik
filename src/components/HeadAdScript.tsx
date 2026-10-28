"use client";

import { useEffect } from "react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { shouldLoadAdScripts } from "@/lib/adGatingPolicy";

/**
 * AdMaven/Yam — script jaringan iklan yang dimuat di <head>.
 *
 * Dimuat sebagai elemen <script> di document.head (bukan di body) sesuai
 * permintaan, tetap menghormati aturan iklan situs: user premium dan sesi yang
 * belum selesai dicek tidak menerima script ini sama sekali.
 */
const AD_SRC = "https://dvwztnx4ab3fl.cloudfront.net/?tzwvd=1730126";
const AD_ID = "admaven-head-script";

export default function HeadAdScript() {
  const { isPremium, loading: premiumLoading } = usePremiumStatus();
  const { user, loading: userLoading } = useSupabaseUser();

  const enabled = shouldLoadAdScripts({
    isPremium,
    premiumLoading,
    hasUser: Boolean(user?.id),
    userLoading,
  });

  useEffect(() => {
    const existing = document.getElementById(AD_ID) as HTMLScriptElement | null;

    if (!enabled) {
      existing?.remove();
      return;
    }
    if (existing) return;

    const script = document.createElement("script");
    script.id = AD_ID;
    script.src = AD_SRC;
    script.async = true;
    // data-cfasync="false" → Cloudflare Rocket Loader tidak menunda script iklan.
    script.setAttribute("data-cfasync", "false");
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [enabled]);

  return null;
}
