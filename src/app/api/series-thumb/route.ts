import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getSourceConfig } from "@/config/sources";
import { projectCoverCandidates } from "@/utils/historyThumbnail";

/**
 * Thumbnail + chapter terbaru untuk kartu riwayat baca di halaman depan.
 * Mengambil dari endpoint detail backend (sudah di-cache backend ±15 menit),
 * lalu di-cache di sini 1 jam — nol Supabase, beban scraper maksimal
 * 1 fetch per sumber+slug per jam.
 */
type SeriesMeta = { thumbnail: string | null; latestChapter: number | null };

function parseChapterNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = String(value ?? "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

const fetchSeriesMeta = unstable_cache(
  async (source: string, slug: string): Promise<SeriesMeta> => {
    try {
      const res = await fetch(
        `https://api.ryukomik.web.id/${source}/detail/${encodeURIComponent(slug)}`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) return { thumbnail: null, latestChapter: null };

      const json = (await res.json()) as {
        data?: {
          thumbnail?: string;
          total_chapter?: number | string;
          chapters?: { title?: string; chapter?: number | string }[];
        };
      };
      const data = json.data;
      if (!data) return { thumbnail: null, latestChapter: null };

      const chapters = Array.isArray(data.chapters) ? data.chapters : [];
      const last = chapters[chapters.length - 1];
      const latestChapter =
        parseChapterNumber(last?.title) ??
        parseChapterNumber(last?.chapter) ??
        parseChapterNumber(data.total_chapter) ??
        (chapters.length || null);

      return { thumbnail: data.thumbnail || null, latestChapter };
    } catch {
      return { thumbnail: null, latestChapter: null };
    }
  },
  ["series-meta-v2"],
  { revalidate: 3600 },
);

/**
 * Project tidak punya endpoint detail; covernya ada di storage sendiri.
 * Cek berurutan (png → webp → jpg) lalu simpan hasilnya 1 jam.
 */
const fetchProjectCover = unstable_cache(
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
  ["project-cover-v1"],
  { revalidate: 3600 },
);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const source = url.searchParams.get("source") || "";
    const slug = (url.searchParams.get("slug") || "").slice(0, 300);
    const config = getSourceConfig(source);
    // Sumber wajib terdaftar (anti abuse/SSRF).
    if (!config || !slug) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    const meta: SeriesMeta =
      config.group === "project"
        ? { thumbnail: await fetchProjectCover(slug), latestChapter: null }
        : await fetchSeriesMeta(source, slug);

    const response = NextResponse.json(meta);
    response.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=3600");
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "gagal" },
      { status: 500 },
    );
  }
}
