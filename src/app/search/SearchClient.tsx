"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SeriesCard from "@/components/SeriesCard";
import type { Dict } from "@/types/common";
import type { SearchResultItem, SourceId } from "@/types/content";

type SearchSourceId = SourceId | "doujindesu";
type SearchSource = { id: SearchSourceId; label: string };
type SearchPageResultItem = Omit<SearchResultItem, "source"> & { source: SearchSourceId };

import {
  MANGA_SOURCES,
  ADULT_SOURCES as ADULT_SOURCE_CONFIGS,
  ADULT_SOURCE_IDS,
} from "@/config/sources";

const COMIC_SOURCES: SearchSource[] = [
  ...MANGA_SOURCES.map(s => ({ id: s.id as SearchSourceId, label: `Source ${s.label}` })),
  ...ADULT_SOURCE_CONFIGS.map(s => ({ id: s.id as SearchSourceId, label: `Source ${s.label}` })),
];
const PUBLIC_SOURCES = COMIC_SOURCES.filter((source) => !ADULT_SOURCE_IDS.has(source.id));
const ADULT_SOURCES = COMIC_SOURCES.filter((source) => ADULT_SOURCE_IDS.has(source.id));
const SOURCE_API_BASE_URL = "https://api.ryukomik.web.id";

const buildSearchUrl = (sourceId: SearchSourceId, query: string) => {
  return `${SOURCE_API_BASE_URL}/${sourceId}/search?q=${encodeURIComponent(query)}`;
};

async function fetchJson<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} saat fetch ${url}`);
  }

  if (!contentType.includes("application/json")) {
    throw new Error(`Response bukan JSON saat fetch ${url}`);
  }

  return res.json();
}

type RawSearchItem = Dict & {
  slug?: string;
  detail_link?: string;
  link?: string;
  title?: string;
  image?: string;
};

const getSlugFromItem = (item: RawSearchItem) => {
  if (item.slug) return item.slug;

  const link = item.detail_link || item.link || "";
  const parts = link.split("/").filter(Boolean);
  return parts.at(-1) || parts.at(-2) || "";
};

const normalizeSlug = (slug: string, sourceId: SearchSourceId) => {
  const prefix = `${sourceId}-`;

  return slug.startsWith(prefix) ? slug.slice(prefix.length) : slug;
};

const normalizeResults = (items: RawSearchItem[] | undefined, source: SearchSource): SearchPageResultItem[] => {
  return (items || [])
    .map((item) => {
      const slug = normalizeSlug(getSlugFromItem(item), source.id);

      return {
        ...item,
        slug,
        source: source.id,
        sourceLabel: source.label,
      };
    })
    .filter((item) => item.slug);
};

export default function SearchClient({
  initialQuery = "",
  initialData = [],
  initialError = false,
}: {
  initialQuery?: string;
  initialData?: SearchPageResultItem[];
  initialError?: boolean;
}) {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const hasInitialSearch = Boolean(q && q === initialQuery);

  const [data, setData] = useState<SearchPageResultItem[]>(hasInitialSearch ? initialData : []);
  const [loading, setLoading] = useState(Boolean(q && !hasInitialSearch));
  const [error, setError] = useState(hasInitialSearch ? initialError : false);
  const [adultData, setAdultData] = useState<SearchPageResultItem[]>([]);
  const [adultLoading, setAdultLoading] = useState(false);
  const [adultError, setAdultError] = useState(false);
  const [adultUnlocked, setAdultUnlocked] = useState(false);
  const initialSearchUsedRef = useRef(hasInitialSearch);

  useEffect(() => {
    if (!q) {
      setLoading(false);
      setData([]);
      setAdultData([]);
      setAdultLoading(false);
      setAdultError(false);
      setAdultUnlocked(false);
      return;
    }

    if (initialSearchUsedRef.current && q === initialQuery) {
      initialSearchUsedRef.current = false;
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError(false);
    setData([]);
    setAdultData([]);
    setAdultLoading(false);
    setAdultError(false);
    setAdultUnlocked(false);

    async function searchPublicSources() {
      try {
        const responses = await Promise.allSettled(
          PUBLIC_SOURCES.map(async (source) => {
            const json = await fetchJson<Dict & { success?: boolean; data?: RawSearchItem[] }>(buildSearchUrl(source.id, q), {
              signal: controller.signal,
            });

            if (json.success === false) return [];

            const items = Array.isArray(json) ? json : json.data;
            return normalizeResults(items, source);
          })
        );

        const merged = responses
          .filter((result) => result.status === "fulfilled")
          .flatMap((result) => result.value);

        const uniqueResults = Array.from(
          new Map(
            merged.map((item) => [`${item.source}:${item.slug}`, item])
          ).values()
        );

        if (!controller.signal.aborted) {
          setData(uniqueResults);
          setError(responses.every((result) => result.status === "rejected"));
        }
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    searchPublicSources();

    return () => controller.abort();
  }, [initialQuery, q]);

  async function searchAdultSources() {
    if (!q || adultLoading || adultUnlocked) return;

    setAdultUnlocked(true);
    setAdultLoading(true);
    setAdultError(false);

    try {
      const responses = await Promise.allSettled(
        ADULT_SOURCES.map(async (source) => {
          const json = await fetchJson<Dict & { success?: boolean; data?: RawSearchItem[] }>(buildSearchUrl(source.id, q));

          if (json.success === false) return [];

          const items = Array.isArray(json) ? json : json.data;
          return normalizeResults(items, source);
        })
      );

      const merged = responses
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => result.value);

      setAdultData(
        Array.from(
          new Map(merged.map((item) => [`${item.source}:${item.slug}`, item])).values()
        )
      );
      setAdultError(responses.every((result) => result.status === "rejected"));
    } catch {
      setAdultData([]);
      setAdultError(true);
    } finally {
      setAdultLoading(false);
    }
  }

  const combinedData = [...data, ...adultData];

  return (
    <div className="rk-page rk-app-surface px-4 pb-24 pt-20 text-white">
      <div className="rk-shell">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/60">
          Search Result
        </p>
        <h1 className="text-2xl font-black">
          Hasil pencarian: <span className="text-cyan-200">{q}</span>
        </h1>
      </div>

      {q && (
        <div className="rk-card mb-5 rounded-2xl p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-rose-200">
                Source 6 & 7 berisi konten 18+
              </p>
              <p className="mt-1 text-xs text-white/55">
                Hasil dari Source 4 dan Source 5 tidak ditampilkan otomatis.
              </p>
            </div>

            <button
              type="button"
              onClick={searchAdultSources}
              disabled={adultLoading || adultUnlocked}
              className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/45"
            >
              {adultLoading
                ? "Memuat Source 6 & 7..."
                : adultUnlocked
                  ? "Source 6 & 7 Ditampilkan"
                  : "Tampilkan Source 6 & 7 (18+)"}
            </button>
          </div>

          {adultError && (
            <p className="mt-3 text-xs text-red-300">
              Source 6 & 7 gagal dimuat. Coba lagi nanti.
            </p>
          )}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="rk-cover-frame animate-pulse" />
              <div className="h-3 rounded bg-white/10" />
            </div>
          ))}
        </div>
      )}
      {error && (
        <div className="rk-state rounded-2xl px-4 py-8 text-center text-sm text-rose-300">
          Terjadi kesalahan.
        </div>
      )}

      {!loading && combinedData.length === 0 && !adultLoading && (
        <div className="rk-state rounded-2xl px-4 py-10 text-center text-sm">
          Tidak ada hasil ditemukan.
        </div>
      )}

      {combinedData.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {combinedData.map((item, idx) => (
            <SeriesCard
              key={`${item.source}-${item.slug}-${idx}`}
              href={`/komik/${item.source}/${item.slug}`}
              title={item.title || "Tanpa judul"}
              image={item.image}
              source={item.source}
              eyebrow={item.update || item.chapter_terbaru || item.latest_chapter}
              corner={
                <span className="rk-cover-badge absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-[var(--accent-2)]">
                  {item.sourceLabel}
                </span>
              }
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
