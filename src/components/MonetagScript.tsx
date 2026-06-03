"use client";

import Script from "next/script";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

export default function MonetagScript() {
  const { loading, isPremium } = usePremiumStatus();

  if (loading || isPremium) return null;

  return (
    <Script id="monetag-script" strategy="afterInteractive">
      {`
        (function(s){
          s.dataset.zone='11093812';
          s.src='https://al5sm.com/tag.min.js';
        })(
          [document.documentElement, document.body]
            .filter(Boolean)
            .pop()
            .appendChild(document.createElement('script'))
        );
      `}
    </Script>
  );
}
