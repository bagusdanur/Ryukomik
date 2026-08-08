/**
 * Shared pending source store for cross-page source navigation.
 * Set from home page "View All" buttons, consumed by TerbaruClient on mount.
 */

let _pending: string | null = null;

export function setPendingSource(source: string) {
  _pending = source;
}

export function getAndClearPendingSource(): string | null {
  const s = _pending;
  _pending = null;
  return s;
}
