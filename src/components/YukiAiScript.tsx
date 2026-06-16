"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function YukiAiScript() {
  const pathname = usePathname() || "";
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    // Gunakan query param timestamp dan cache no-store untuk menghindari cache CDN / Browser
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
    return () => {
      active = false;
    };
  }, []);

  const isComicPage = pathname === "/komik" || pathname.startsWith("/komik/");
  const isChapterPage = pathname === "/chapter" || pathname.startsWith("/chapter/");
  const shouldShow = enabled && !isComicPage && !isChapterPage;

  useEffect(() => {
    if (shouldShow) {
      // Pastikan script tidak dimuat ganda
      if (document.getElementById("yuki-ai-widget-script")) return;

      const script = document.createElement("script");
      script.id = "yuki-ai-widget-script";
      script.src = "https://yuki.ryukomik.web.id/widget.js";
      script.setAttribute("data-host", "https://yuki.ryukomik.web.id");
      script.setAttribute("data-position", "right");
      script.async = true;

      document.body.appendChild(script);

      return () => {
        cleanupYukiWidget();
      };
    } else {
      // Jika statusnya dinonaktifkan atau masuk ke halaman komik/chapter, lakukan pembersihan
      cleanupYukiWidget();
    }
  }, [shouldShow]);

  // Fungsi untuk membersihkan semua elemen sisa dari widget Yuki AI di DOM
  function cleanupYukiWidget() {
    // 1. Hapus tag script
    const scriptEl = document.getElementById("yuki-ai-widget-script");
    if (scriptEl) scriptEl.remove();

    // 2. Cari dan hapus iframe yang dimuat dari domain yuki
    document.querySelectorAll("iframe").forEach((iframe) => {
      if (iframe.src && (iframe.src.includes("yuki.ryukomik.web.id") || iframe.src.includes("yuki-ai"))) {
        iframe.remove();
      }
    });

    // 3. Cari dan hapus div/button/kontainer melayang yang ID atau kelasnya mengandung kata "yuki"
    document.querySelectorAll("div, button, section").forEach((node) => {
      const id = node.id || "";
      const className = typeof node.className === "string" ? node.className : "";
      if (
        id.toLowerCase().includes("yuki") || 
        className.toLowerCase().includes("yuki")
      ) {
        node.remove();
      }
    });
  }

  return null;
}
