import "server-only";

import { unstable_cache } from "next/cache";
import { projectCoverCandidates } from "@/utils/historyThumbnail";

/**
 * Metadata seri (cover, chapter terakhir, tanggal update) untuk halaman
 * riwayat/koleksi. Satu cache 1 jam per source+slug supaya tidak menambah
 * beban scraper meski dipanggil dari beberapa endpoint.
 */
export type SeriesMeta = {
  thumbnail: string | null;
  latestChapter: number | null;
  latestChapterAt: string | null;
};

function parseChapterNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = String(value ?? "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

/** "31/10/2025" atau "2025-10-31" → ISO; null kalau tidak bisa dibaca. */
function parseDate(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export const getSeriesMeta = unstable_cache(
  async (source: string, slug: string): Promise<SeriesMeta> => {
    try {
      const res = await fetch(
        `https://api.ryukomik.web.id/${source}/detail/${encodeURIComponent(slug)}`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) return { thumbnail: null, latestChapter: null, latestChapterAt: null };

      const json = (await res.json()) as {
        data?: {
          thumbnail?: string;
          total_chapter?: number | string;
          chapters?: { title?: string; chapter?: number | string; date?: string }[];
        };
      };
      const data = json.data;
      if (!data) return { thumbnail: null, latestChapter: null, latestChapterAt: null };

      const chapters = Array.isArray(data.chapters) ? data.chapters : [];
      const last = chapters[chapters.length - 1];
      const latestChapter =
        parseChapterNumber(last?.title) ??
        parseChapterNumber(last?.chapter) ??
        parseChapterNumber(data.total_chapter) ??
        (chapters.length || null);

      return {
        thumbnail: data.thumbnail || null,
        latestChapter,
        latestChapterAt: parseDate(last?.date),
      };
    } catch {
      return { thumbnail: null, latestChapter: null, latestChapterAt: null };
    }
  },
  ["series-meta-v3"],
  { revalidate: 3600 },
);

export const getProjectCover = unstable_cache(
  async (slug: string): Promise<string | null> => {
    for (const candidate of projectCoverCandidates(slug)) {
      try {
        const res = await fetch(candidate, { method: "HEAD", next: { revalidate: 3600 } });
        if (res.ok) return candidate;
      } catch {
        // coba ekstensi berikutnya
      }
    }
    return null;
  },
  ["project-cover-v2"],
  { revalidate: 3600 },
);
