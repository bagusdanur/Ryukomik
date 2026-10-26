import "server-only";

import { isStorageHost } from "@/lib/storageHosts";

/**
 * Cover project dari storage sendiri dilewatkan /api/cover supaya yang dikirim
 * ke browser versi WebP kecil, bukan PNG 2 MB. Host lain dibiarkan apa adanya.
 */
export function optimizedCoverUrl(url: string | null | undefined, width = 400): string {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    if (
      parsed.protocol === "https:" &&
      isStorageHost(parsed.hostname) &&
      parsed.pathname.startsWith("/covers/")
    ) {
      return `/api/cover?u=${encodeURIComponent(parsed.href)}&w=${width}`;
    }
  } catch {
    return url;
  }

  return url;
}
