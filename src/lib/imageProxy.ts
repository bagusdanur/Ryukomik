const PUBLIC_PROXY_IMAGE_SOURCES = new Set(["sekte", "doujindesu"]);
const PUBLIC_PROXY_IMAGE_HOSTS = new Set(["desu.photos"]);
const DOUJINDESU_IMAGE_WORKER = "/api/image-proxy";
const KIRYUU_IMAGE_WORKER = "/api/image-proxy";
const KIRYUU_IMAGE_HOSTS = new Set([
  "v5.kiryuu.to",
  "v4.kiryuu.to",
  "v3.kiryuu.to",
  "kiryuu.io",
]);

export function getOriginalImageUrl(url?: string) {
  if (!url) return "";

  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(url, base);
    if (
      parsed.origin === "https://proxy.ryukomik.my.id" ||
      parsed.origin === "https://cdn.ryukomik.my.id" ||
      parsed.pathname === "/api/image-proxy"
    ) {
      return parsed.searchParams.get("url") || url;
    }
    return url;
  } catch {
    return url;
  }
}

export function toDoujindesuWorkerImageUrl(url?: string) {
  if (!url) return "";
  return `${DOUJINDESU_IMAGE_WORKER}?url=${encodeURIComponent(url)}`;
}

export function toKiryuuWorkerImageUrl(url?: string) {
  if (!url) return "";
  return `${KIRYUU_IMAGE_WORKER}?url=${encodeURIComponent(url)}`;
}

export function shouldUsePublicChapterProxy(source: string, url?: string) {
  if (!url) return false;
  if (PUBLIC_PROXY_IMAGE_SOURCES.has(source)) return true;

  try {
    const { hostname } = new URL(url);
    return PUBLIC_PROXY_IMAGE_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

export function getChapterImageCandidates(source: string, url?: string) {
  const originalUrl = getOriginalImageUrl(url);
  if (!originalUrl) return [];
  if (!shouldUsePublicChapterProxy(source, originalUrl)) return [originalUrl];

  return [
    toDoujindesuWorkerImageUrl(originalUrl),
    originalUrl,
  ];
}

export function shouldUseKiryuuCoverProxy(source: string, url?: string) {
  if (!url || source !== "kiryuu") return false;

  try {
    const { hostname } = new URL(url);
    return KIRYUU_IMAGE_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

export function getCoverImageCandidates(source: string, url?: string) {
  const originalUrl = getOriginalImageUrl(url);
  if (!originalUrl) return [];
  if (!shouldUseKiryuuCoverProxy(source, originalUrl)) return [originalUrl];

  return [
    toKiryuuWorkerImageUrl(originalUrl),
    originalUrl,
  ];
}

export function getProxiedThumbnailUrl(url?: string, source?: string): string {
  if (!url) return "";
  const originalUrl = getOriginalImageUrl(url);

  const isAdultSource = source === "doujindesu" || source === "sekte";
  let shouldProxy = isAdultSource;

  if (!shouldProxy) {
    try {
      const parsed = new URL(originalUrl);
      if (
        parsed.hostname.includes("desu.") ||
        parsed.hostname.includes("doujindesu") ||
        PUBLIC_PROXY_IMAGE_HOSTS.has(parsed.hostname)
      ) {
        shouldProxy = true;
      }
    } catch {}
  }

  if (shouldProxy) {
    return toDoujindesuWorkerImageUrl(originalUrl);
  }

  if (source === "kiryuu" && shouldUseKiryuuCoverProxy(source, originalUrl)) {
    return toKiryuuWorkerImageUrl(originalUrl);
  }

  return originalUrl;
}

