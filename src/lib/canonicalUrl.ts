import { VALID_SOURCE_IDS } from "@/config/sources";

export const SITE_URL = "https://ryukomik.my.id";

export const PUBLIC_COMIC_SOURCES = [
  "komiku",
  "komikid",
  "josei",
  "luvyaa",
  "kiryuu",
  "project",
] as const;

export function normalizeSource(source: string): string | null {
  const normalized = decodeURIComponent(source || "").trim().toLowerCase();
  return normalized && VALID_SOURCE_IDS.has(normalized) ? normalized : null;
}

function cleanPathValue(value: string): string {
  return decodeURIComponent(value || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
}

export function normalizeComicSlug(source: string, slug: string): string {
  const canonicalSource = normalizeSource(source) || source.toLowerCase();
  let normalized = cleanPathValue(slug).toLowerCase();
  const prefix = `${canonicalSource}-`;

  while (normalized.startsWith(prefix)) {
    normalized = normalized.slice(prefix.length);
  }

  return normalized;
}

export function normalizeChapterSlug(source: string, slug: string | string[]): string {
  const value = Array.isArray(slug) ? slug.join("/") : slug;
  const canonicalSource = normalizeSource(source) || source.toLowerCase();
  const parts = cleanPathValue(value).split("/").filter(Boolean);

  if (parts.length === 1) {
    return normalizeComicSlug(canonicalSource, parts[0]);
  }

  parts[0] = normalizeComicSlug(canonicalSource, parts[0]);
  return parts.join("/").toLowerCase();
}

function encodePath(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

export function buildCanonicalUrl(
  path: string,
  query?: URLSearchParams | Record<string, string | number | undefined>,
): string {
  const pathname = path === "/" ? "/" : `/${path.split("/").filter(Boolean).join("/")}`;
  const params = query instanceof URLSearchParams
    ? new URLSearchParams(query)
    : new URLSearchParams(
        Object.entries(query || {})
          .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
          .map(([key, value]) => [key, String(value)]),
      );
  params.sort();
  const search = params.toString();
  return `${SITE_URL}${pathname}${search ? `?${search}` : ""}`;
}

export function buildComicUrl(source: string, slug: string): string {
  const canonicalSource = normalizeSource(source);
  if (!canonicalSource) return "";
  const canonicalSlug = normalizeComicSlug(canonicalSource, slug);
  if (!canonicalSlug) return "";
  return buildCanonicalUrl(`/komik/${canonicalSource}/${encodePath(canonicalSlug)}`);
}

export function buildChapterUrl(source: string, slug: string | string[]): string {
  const canonicalSource = normalizeSource(source);
  if (!canonicalSource) return "";
  const canonicalSlug = normalizeChapterSlug(canonicalSource, slug);
  if (!canonicalSlug) return "";
  return buildCanonicalUrl(`/chapter/${canonicalSource}/${encodePath(canonicalSlug)}`);
}
