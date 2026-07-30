"use client";

import { useEffect } from "react";

const VISITOR_KEY = "ryukomik:project-viewer-id";
const VIEW_PREFIX = "ryukomik:project-view:";
const VIEW_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MIN_READING_MS = 7000;

function getVisitorId() {
  const existing = window.localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;
  const visitorId = crypto.randomUUID();
  window.localStorage.setItem(VISITOR_KEY, visitorId);
  return visitorId;
}

export function useProjectViewCounter(source: string, mangaSlug?: string) {
  useEffect(() => {
    if (source !== "project" || !mangaSlug) return;

    const viewKey = `${VIEW_PREFIX}${mangaSlug}`;
    const previous = Number(window.localStorage.getItem(viewKey) || 0);
    if (Date.now() - previous < VIEW_COOLDOWN_MS) return;

    const timer = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      const visitorId = getVisitorId();
      void fetch(`/api/project/view/${encodeURIComponent(mangaSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
        keepalive: true,
      }).then((response) => {
        if (response.ok) window.localStorage.setItem(viewKey, String(Date.now()));
      }).catch(() => undefined);
    }, MIN_READING_MS);

    return () => window.clearTimeout(timer);
  }, [source, mangaSlug]);
}
