/**
 * Shared pending source store for cross-page source navigation.
 * Set from home page "View All" buttons, consumed by TerbaruClient on mount.
 */

let _pending: string | null = null;
const STORAGE_KEY = "rk_pending_source";

export function setPendingSource(source: string) {
  _pending = source;
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, source);
    localStorage.setItem("source", source);
  }
}

export function getAndClearPendingSource(): string | null {
  const stored = typeof window !== "undefined"
    ? sessionStorage.getItem(STORAGE_KEY)
    : null;
  const s = stored || _pending;
  _pending = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  return s;
}
