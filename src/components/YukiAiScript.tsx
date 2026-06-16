"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

export default function YukiAiScript() {
  const pathname = usePathname() || "";
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/yuki-ai-settings")
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          setEnabled(data.enabled !== false);
        }
      })
      .catch(() => {
        if (active) {
          setEnabled(true); // default to true on error
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Don't render if settings are not loaded yet or disabled
  if (enabled === null || !enabled) return null;

  // Don't show on comic or chapter pages
  const isComicPage = pathname === "/komik" || pathname.startsWith("/komik/");
  const isChapterPage = pathname === "/chapter" || pathname.startsWith("/chapter/");

  if (isComicPage || isChapterPage) return null;

  return (
    <Script
      id="yuki-ai-widget"
      src="https://yuki-ai.ryukomik.my.id/widget.js"
      data-host="https://yuki-ai.ryukomik.my.id"
      data-position="right"
      strategy="afterInteractive"
      async
    />
  );
}
