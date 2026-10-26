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

export type SeriesMeta = { thumbnail: string | null; latestChapter: number | null };

/** "Chapter 389" / "Ch. 12.5" / 389 → 389 / 12.5 / 389. */
export function chapterNumberFrom(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = String(value ?? "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

/** Selisih chapter: berapa chapter di belakang chapter terbaru. */
export function chaptersBehind(read: number | null, latest: number | null): number | null {
  if (read === null || latest === null) return null;
  return Math.max(0, Math.round((latest - read) * 10) / 10);
}

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


export type ContinueInput = HistoryThumbItem & {
  title?: string | null;
  lastChapter?: string | null;
  lastChapterSlug?: string | null;
  updatedAt?: number | null;
};

/** "class-no-jimo" → "Class No Jimo" (judul cadangan kalau entry tanpa judul). */
export function prettifySlug(slug: string): string {
  return String(slug || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Siapkan isi "Lanjut Baca": buang entry tanpa identitas, urutkan dari yang
 * paling baru (bukan mengandalkan urutan array), beri judul cadangan, lalu
 * potong sesuai limit. Entry tanpa judul TIDAK dibuang — dulu itu sebabnya
 * bacaan baru tidak muncul di daftar.
 */
export function buildContinueItems<T extends ContinueInput>(
  items: T[],
  limit = 10,
): (T & { displayTitle: string })[] {
  return items
    .filter((item) => String(item.comicSlug || "").trim() || String(item.lastChapterSlug || "").trim())
    .slice()
    .sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0))
    .slice(0, limit)
    .map((item) => {
      // Riwayat lama (source project) bisa menyimpan judul berupa "Chapter 4".
      // Judul berbau chapter diperlakukan kosong -> pakai judul dari slug seri.
      const rawTitle = String(item.title || "").trim();
      const chapterLike = /^(chapter|ch\.?)\s*[\d.]/i.test(rawTitle);
      return {
        ...item,
        displayTitle:
          (!chapterLike && rawTitle) ||
          prettifySlug(String(item.comicSlug || "")) ||
          "Lanjutan",
      };
    });
}

const memo = new Map<string, Promise<SeriesMeta>>();

/** Thumbnail + chapter terbaru lewat endpoint cache. Tidak pernah melempar error. */
export function fetchSeriesMeta(source: string, slug: string): Promise<SeriesMeta> {
  const key = `${source}|${slug}`;
  const cached = memo.get(key);
  if (cached) return cached;

  const request = (async (): Promise<SeriesMeta> => {
    try {
      const res = await fetch(
        `/api/series-thumb?source=${encodeURIComponent(source)}&slug=${encodeURIComponent(slug)}`,
        { signal: AbortSignal.timeout(8_000) },
      );
      if (!res.ok) return { thumbnail: null, latestChapter: null };
      const json = (await res.json()) as {
        thumbnail?: string | null;
        latestChapter?: number | null;
      };
      return {
        thumbnail: typeof json.thumbnail === "string" && json.thumbnail ? json.thumbnail : null,
        latestChapter:
          typeof json.latestChapter === "number" && Number.isFinite(json.latestChapter)
            ? json.latestChapter
            : null,
      };
    } catch {
      return { thumbnail: null, latestChapter: null };
    }
  })();

  memo.set(key, request);
  return request;
}

/** Thumbnail saja (dipakai halaman chapter saat menyimpan riwayat). */
export async function fetchSeriesThumbnail(source: string, slug: string): Promise<string | null> {
  const meta = await fetchSeriesMeta(source, slug);
  return meta.thumbnail;
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
