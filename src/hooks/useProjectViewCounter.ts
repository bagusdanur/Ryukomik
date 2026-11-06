"use client";

import { useEffect } from "react";

const VISITOR_KEY = "ryukomik:project-viewer-id";
const MIN_READING_MS = 2000;

function getVisitorId() {
  const existing = window.localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;
  const visitorId = crypto.randomUUID();
  window.localStorage.setItem(VISITOR_KEY, visitorId);
  return visitorId;
}

export function useProjectViewCounter(source: string, mangaSlug?: string, chapterSlug?: string) {
  useEffect(() => {
    if (source !== "project" || !mangaSlug || !chapterSlug) return;

    const chapterMatch = chapterSlug.match(/(?:chapter[-/\s]?)(\d+(?:\.\d+)?)/i);
    if (!chapterMatch) return;
    const chapterNumber = chapterMatch[1];
    let eligible = false;
    let sent = false;

    const send = () => {
      if (!eligible || sent || document.visibilityState !== "visible") return;
      sent = true;
      const visitorId = getVisitorId();
      void fetch(`/api/project/view/${encodeURIComponent(mangaSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, chapterNumber }),
        keepalive: true,
      }).catch(() => {
        // Analytics tidak boleh mengganggu reader. Izinkan percobaan ulang saat
        // tab terlihat lagi bila request pertama gagal sebelum terkirim.
        sent = false;
      });
    };

    const timer = window.setTimeout(() => {
      eligible = true;
      send();
    }, MIN_READING_MS);
    const onVisibility = () => send();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [source, mangaSlug, chapterSlug]);
}
