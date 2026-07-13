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
  const [sourceStatus, setSourceStatus] = useState<Record<string, "loading" | "done" | "error">>({});
  const initialSearchUsedRef = useRef(hasInitialSearch);

  useEffect(() => {
    if (!q) {
      setLoading(false);
      setData([]);
      setAdultData([]);
      setAdultLoading(false);
      setAdultError(false);
      setAdultUnlocked(false);
      setSourceStatus({});
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
      const initialStatus: Record<string, "loading" | "done" | "error"> = {};
      PUBLIC_SOURCES.forEach((s) => {
        initialStatus[s.id] = "loading";
      });
      setSourceStatus(initialStatus);

      let pending = PUBLIC_SOURCES.length;
      let failed = 0;

      PUBLIC_SOURCES.forEach(async (source) => {
        try {
          const json = await fetchJson<Dict & { success?: boolean; data?: RawSearchItem[] }>(buildSearchUrl(source.id, q), {
            signal: controller.signal,
          });

          if (controller.signal.aborted) return;

          if (json.success === false) throw new Error("Failed");

          const items = Array.isArray(json) ? json : json.data;
          const normalized = normalizeResults(items, source);

          setData((prev) => {
            const merged = [...prev, ...normalized];
            return Array.from(
              new Map(merged.map((item) => [`${item.source}:${item.slug}`, item])).values()
            );
          });

          setSourceStatus(prev => ({ ...prev, [source.id]: "done" }));
        } catch {
          if (!controller.signal.aborted) {
            failed++;
            setSourceStatus(prev => ({ ...prev, [source.id]: "error" }));
          }
        } finally {
          if (!controller.signal.aborted) {
            pending--;
            if (pending === 0) {
              setLoading(false);
              if (failed === PUBLIC_SOURCES.length) setError(true);
            }
          }
        }
      });
    }

    searchPublicSources();

    return () => controller.abort();
  }, [initialQuery, q]);

  async function searchAdultSources() {
    if (!q || adultLoading || adultUnlocked) return;

    setAdultUnlocked(true);
    setAdultLoading(true);
    setAdultError(false);

    let pending = ADULT_SOURCES.length;
    let failed = 0;

    ADULT_SOURCES.forEach(async (source) => {
      try {
        const json = await fetchJson<Dict & { success?: boolean; data?: RawSearchItem[] }>(buildSearchUrl(source.id, q));

        if (json.success === false) throw new Error("Failed");

        const items = Array.isArray(json) ? json : json.data;
        const normalized = normalizeResults(items, source);

        setAdultData(prev => {
          const merged = [...prev, ...normalized];
          return Array.from(
            new Map(merged.map((item) => [`${item.source}:${item.slug}`, item])).values()
          );
        });
      } catch {
        failed++;
      } finally {
        pending--;
        if (pending === 0) {
          setAdultLoading(false);
          if (failed === ADULT_SOURCES.length) setAdultError(true);
        }
      }
    });
  }

  const combinedData = [...data, ...adultData];

  return (
    <div className="rk-page rk-app-surface px-4 pb-24 pt-20 text-white">
      <div className="rk-shell">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/60">
          Search Result
        </p>
        <h1 className="text-2xl font-black mb-3">
          Hasil pencarian: <span className="text-cyan-200">{q}</span>
        </h1>

        {/* Source Progress Indicator */}
        {q && Object.keys(sourceStatus).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {PUBLIC_SOURCES.map(source => {
              const status = sourceStatus[source.id];
              if (!status) return null;
              
              return (
                <div 
                  key={source.id} 
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                    status === "loading" ? "bg-white/5 border-white/10 text-white/50" :
                    status === "done" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                    "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  }`}
                >
                  {status === "loading" && <div className="w-2 h-2 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />}
                  {status === "done" && <span>✓</span>}
                  {status === "error" && <span>✕</span>}
                  {source.label}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {q && (
        <div className="rk-card mb-5 rounded-2xl p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-rose-200">
                Source 6 & 7 berisi konten 18+
              </p>
              <p className="mt-1 text-xs text-white/55">
                Hasil dari Source 6 dan Source 7 tidak ditampilkan otomatis.
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
