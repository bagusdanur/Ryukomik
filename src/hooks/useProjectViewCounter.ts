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

    const timer = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      const visitorId = getVisitorId();
      void fetch(`/api/project/view/${encodeURIComponent(mangaSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, chapterNumber }),
        keepalive: true,
      }).catch(() => undefined);
    }, MIN_READING_MS);

    return () => window.clearTimeout(timer);
  }, [source, mangaSlug, chapterSlug]);
}
