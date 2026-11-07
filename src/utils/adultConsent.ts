"use client";

export const ADULT_CONSENT_KEY = "rk-adult-consent-until";
export const ADULT_CONSENT_EVENT = "rk-adult-consent-changed";
export const ADULT_CONSENT_REQUEST = "rk-adult-consent-request";
export const ADULT_CONSENT_DAYS = 30;

const ADULT_SOURCES = new Set(["sekte", "doujindesu", "sektedoujin", "hentai"]);

export function isAdultSource(source?: string | null): boolean {
  return ADULT_SOURCES.has(String(source || "").toLowerCase());
}

export function hasAdultConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const until = Number(localStorage.getItem(ADULT_CONSENT_KEY) || 0);
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

export function grantAdultConsent(): void {
  if (typeof window === "undefined") return;
  const until = Date.now() + ADULT_CONSENT_DAYS * 24 * 60 * 60 * 1000;
  try { localStorage.setItem(ADULT_CONSENT_KEY, String(until)); } catch {}
  window.dispatchEvent(new CustomEvent(ADULT_CONSENT_EVENT, { detail: true }));
}

export function revokeAdultConsent(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(ADULT_CONSENT_KEY); } catch {}
  window.dispatchEvent(new CustomEvent(ADULT_CONSENT_EVENT, { detail: false }));
}

export function requestAdultConsent(onApproved?: () => void): void {
  if (typeof window === "undefined") return;
  if (hasAdultConsent()) { onApproved?.(); return; }
  window.dispatchEvent(new CustomEvent(ADULT_CONSENT_REQUEST, { detail: { onApproved } }));
}
