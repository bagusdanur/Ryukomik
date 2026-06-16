"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

type YukiAiScriptProps = {
  enabled: boolean;
};

export default function YukiAiScript({ enabled }: { enabled: boolean }) {
  const pathname = usePathname() || "";

  if (!enabled) return null;

  // Don't show on comic or chapter pages
  const isComicPage = pathname === "/komik" || pathname.startsWith("/komik/");
  const isChapterPage = pathname === "/chapter" || pathname.startsWith("/chapter/");

  if (isComicPage || isChapterPage) return null;

  return (
    <Script
      id="yuki-ai-widget"
      src="https://yuki.ryukomik.web.id/widget.js"
      data-host="https://yuki.ryukomik.web.id"
      data-position="right"
      strategy="afterInteractive"
      async
    />
  );
}
