const PUBLIC_PROXY_IMAGE_SOURCES = new Set(["sekte", "doujindesu"]);
const PUBLIC_PROXY_IMAGE_HOSTS = new Set(["desu.photos"]);
const DOUJINDESU_IMAGE_WORKER = "/api/image-proxy";

export function getOriginalImageUrl(url?: string): string {
  if (!url) return "";

  try {
    let cleanUrl = url;
    if (cleanUrl.includes(".wp.com/")) {
      cleanUrl = cleanUrl.replace(/^https?:\/\/[a-z0-9]+\.wp\.com\//i, "https://");
    }

    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(cleanUrl, base);

    const isFrontendProxy =
      parsed.origin === "https://proxy.ryukomik.my.id" ||
      parsed.origin === "https://cdn.ryukomik.my.id" ||
      parsed.pathname === "/api/image-proxy" ||
      parsed.pathname === "/api/image" ||
      parsed.pathname === "/image";

    let shouldExtract = isFrontendProxy;

    if (!shouldExtract && parsed.origin === "https://api.ryukomik.web.id") {
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      const urlSource = pathParts[0];
      if (urlSource === "doujindesu" || urlSource === "sekte") {
        shouldExtract = true;
      }
    }

    if (shouldExtract) {
      const nestedUrl = parsed.searchParams.get("url");
      if (nestedUrl) {
        return getOriginalImageUrl(nestedUrl);
      }
    }
    return cleanUrl;
  } catch {
    return url;
  }
}

export function toDoujindesuWorkerImageUrl(url?: string) {
  if (!url) return "";
  return `${DOUJINDESU_IMAGE_WORKER}?url=${encodeURIComponent(url)}`;
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

export function getProxiedThumbnailUrl(url?: string, source?: string): string {
  if (!url) return "";
  const originalUrl = getOriginalImageUrl(url);

  // Jika URL relatif (tidak dimulai http), skip — biar gak error di image proxy
  if (!originalUrl.startsWith("http")) return "";

  const isAdultSource = source === "doujindesu" || source === "sekte";
  let shouldProxy = isAdultSource;

  if (!shouldProxy) {
    try {
      const parsed = new URL(originalUrl);
      if (
        parsed.hostname.includes("desu.") ||
        parsed.hostname.includes("doujindesu") ||
        parsed.hostname.includes("sektedoujin") ||
        PUBLIC_PROXY_IMAGE_HOSTS.has(parsed.hostname)
      ) {
        shouldProxy = true;
      }
    } catch {}
  }

  if (shouldProxy) {
    return toDoujindesuWorkerImageUrl(originalUrl);
  }

  return originalUrl;
}

