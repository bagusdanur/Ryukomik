"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

function cleanupYukiWidget() {
  document.getElementById("yuki-ai-widget-script")?.remove();

  document.querySelectorAll("iframe").forEach((iframe) => {
    if (iframe.src && (iframe.src.includes("yuki.ryukomik.web.id") || iframe.src.includes("yuki-ai"))) {
      iframe.remove();
    }
  });

  document.querySelectorAll('[id*="yuki" i], [class*="yuki" i]').forEach((node) => {
    node.remove();
  });
}

export default function YukiAiScript() {
  const pathname = usePathname() || "";
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    // Delay fetch 3 detik untuk membiarkan loading utama selesai
    const timer = setTimeout(() => {
      fetch(`/api/yuki-ai-settings?t=${Date.now()}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (active) {
            setEnabled(data.enabled !== false);
          }
        })
        .catch(() => {
          if (active) {
            setEnabled(true); // default ke true jika gagal fetch
          }
        });
    }, 3000);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const isComicPage = pathname === "/komik" || pathname.startsWith("/komik/");
  const isChapterPage = pathname === "/chapter" || pathname.startsWith("/chapter/");
  const shouldShow = enabled && !isComicPage && !isChapterPage;

  useEffect(() => {
    if (shouldShow) {
      // Pastikan script tidak dimuat ganda
      if (document.getElementById("yuki-ai-widget-script")) return;

      let idleId: number | null = null;

      const injectScript = () => {
        const script = document.createElement("script");
        script.id = "yuki-ai-widget-script";
        script.src = "https://yuki.ryukomik.web.id/widget.js";
        script.setAttribute("data-host", "https://yuki.ryukomik.web.id");
        script.setAttribute("data-position", "right");
        script.async = true;
        document.body.appendChild(script);
      };

      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(injectScript);
      } else {
        injectScript();
      }

      return () => {
        if (idleId && typeof window !== "undefined" && "cancelIdleCallback" in window) {
          window.cancelIdleCallback(idleId);
        }
        cleanupYukiWidget();
      };
    } else {
      // Jika statusnya dinonaktifkan atau masuk ke halaman komik/chapter, lakukan pembersihan
      cleanupYukiWidget();
    }
  }, [shouldShow]);

  return null;
}
