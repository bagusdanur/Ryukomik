import { CACHE_TTL, PRIVATE_API_PREFIXES, PRIVATE_PATH_PREFIXES } from "./constants";

export function publicCacheHeader(ttl: number, staleMultiplier = 10): string {
  return `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * staleMultiplier}`;
}

export function noStoreHeader(): string {
  return "no-store, no-cache, must-revalidate, proxy-revalidate";
}

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isPrivateApiPath(pathname: string): boolean {
  return PRIVATE_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function sourceTtl(path: string): number {
  if (path.includes("chapter")) return CACHE_TTL.chapter;
  if (path.includes("filters") || path.includes("list") || path.includes("detail")) return CACHE_TTL.publicMedium;
  if (path.includes("search")) return CACHE_TTL.search;
  if (path.includes("home") || path.includes("pustaka")) return CACHE_TTL.publicShort;
  return 60;
}
