/**
 * Thumbnail untuk riwayat baca.
 *
 * Riwayat disimpan di localStorage, jadi thumbnail harus diambil sekali lalu
 * ikut tersimpan. Semua fetch di sini lewat /api/series-thumb yang sudah
 * di-cache 1 jam di server + CDN, dan hasilnya di-memo per sesi supaya satu
 * series tidak pernah diminta dua kali.
 */

export const PROJECT_COVER_BASE = "https://storage.ryukomik.my.id/covers";
const PROJECT_COVER_EXTS = ["png", "webp", "jpg"] as const;

export type HistoryThumbItem = {
  comicSlug?: string | null;
  source?: string | null;
  thumbnail?: string | null;
};

/** Ambil segmen pertama yang aman dari slug project (buang "." dan ".."). */
export function normalizeProjectSlug(raw: string): string {
  const segments = String(raw || "")
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..");
  const first = segments[0] ?? "";
  return first
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Kandidat cover project di storage, urut dari yang paling umum. */
export function projectCoverCandidates(slug: string): string[] {
  const safe = normalizeProjectSlug(slug);
  if (!safe) return [];
  return PROJECT_COVER_EXTS.map((ext) => `${PROJECT_COVER_BASE}/${safe}/cover.${ext}`);
}

/** Entry yang belum punya thumbnail, unik per sumber+slug, dibatasi `limit`. */
export function itemsMissingThumbnails<T extends HistoryThumbItem>(items: T[], limit: number): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (out.length >= limit) break;
    const slug = String(item.comicSlug || "").trim();
    if (!slug || item.thumbnail) continue;
    const key = `${item.source || "komiku"}|${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

const memo = new Map<string, Promise<string | null>>();

/** Ambil thumbnail series lewat endpoint cache. Tidak pernah melempar error. */
export function fetchSeriesThumbnail(source: string, slug: string): Promise<string | null> {
  const key = `${source}|${slug}`;
  const cached = memo.get(key);
  if (cached) return cached;

  const request = (async () => {
    try {
      const res = await fetch(
        `/api/series-thumb?source=${encodeURIComponent(source)}&slug=${encodeURIComponent(slug)}`,
        { signal: AbortSignal.timeout(8_000) },
      );
      if (!res.ok) return null;
      const json = (await res.json()) as { thumbnail?: string | null };
      return typeof json.thumbnail === "string" && json.thumbnail ? json.thumbnail : null;
    } catch {
      return null;
    }
  })();

  memo.set(key, request);
  return request;
}

/** Isi thumbnail untuk entry lama. Berurutan dan dibatasi agar tetap ringan. */
export async function backfillHistoryThumbnails<T extends HistoryThumbItem>(
  items: T[],
  limit = 8,
): Promise<{ comicSlug: string; thumbnail: string }[]> {
  const missing = itemsMissingThumbnails(items, limit);
  const found: { comicSlug: string; thumbnail: string }[] = [];

  for (const item of missing) {
    const slug = String(item.comicSlug || "").trim();
    const thumbnail = await fetchSeriesThumbnail(item.source || "komiku", slug);
    if (thumbnail) found.push({ comicSlug: slug, thumbnail });
  }

  return found;
}
