"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SeriesCard from "@/components/SeriesCard";
import Button from "@/components/Button";

interface GenreResultItem {
  title: string;
  description: string;
  link: string;
  image: string;
  typeGenre: string;
  chapterStart: string;
  chapterLast: string;
}

interface GenreResponse {
  genre: string;
  page: number | string;
  total?: number;
  results: GenreResultItem[];
}

interface GenreClientProps {
  initialData: GenreResponse | null;
  slug: string;
  title: string;
}

const STORAGE_KEY_PREFIX = "genre_page_";

const getSlugFromLink = (url: string) => {
  const parts = url.split("/").filter(Boolean);
  return parts.at(-1) || parts.at(-2) || "";
};

const typeBadge = (typeGenre?: string) => {
  const firstWord = typeGenre?.split(" ")[0];
  if (firstWord === "Manhwa") return "KR";
  if (firstWord === "Manhua") return "CN";
  if (firstWord === "Manga") return "JP";
  return firstWord?.slice(0, 3).toUpperCase() || "";
};

function typeFlag(type?: string): { src: string; label: string } | null {
  const t = (type || "").toLowerCase();
  if (t.includes("manhwa")) return { src: "/flags/kr.svg", label: "Korea" };
  if (t.includes("manhua")) return { src: "/flags/cn.svg", label: "China" };
  if (t.includes("manga")) return { src: "/flags/jp.svg", label: "Jepang" };
  return null;
}

const formatChapter = (ch?: string) => {
  if (!ch) return "";
  return ch.replace(/Chapter/i, "Ch.");
};

function SkeletonCard() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="rk-cover-frame bg-white/5" />
      <div className="h-4 w-3/4 rounded bg-white/10" />
      <div className="h-3 w-1/2 rounded bg-white/5" />
    </div>
  );
}

export default function GenreClient({ initialData, slug, title }: GenreClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const restoredRef = useRef(false);

  const currentPage = Number(searchParams.get("page") ?? "1");

  const [data, setData] = useState<GenreResponse | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);

  // Restore page from sessionStorage on first mount (no ?page= in URL)
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const urlPage = searchParams.get("page");
    if (!urlPage) {
      try {
        const saved = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${slug}`);
        if (saved) {
          const savedPage = Number(saved);
          if (savedPage > 1) {
            router.replace(`?page=${savedPage}`);
            return;
          }
        }
      } catch {}
    }
  }, [slug, searchParams, router]);

  // Save current page to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(`${STORAGE_KEY_PREFIX}${slug}`, String(currentPage));
    } catch {}
  }, [currentPage, slug]);

  // Fetch data when page changes
  useEffect(() => {
    if (currentPage === 1 && initialData) {
      const frame = requestAnimationFrame(() => {
        setData(initialData);
        setLoading(false);
        setError(false);
        setHasNextPage(initialData.results.length > 0);
      });
      return () => cancelAnimationFrame(frame);
    }

    let active = true;
    const frame = requestAnimationFrame(() => {
      if (active) {
        setLoading(true);
        setError(false);
      }
    });

    fetch(`https://api.ryukomik.web.id/genre/${slug}?page=${currentPage}`)
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat data");
        return res.json();
      })
      .then((json: GenreResponse) => {
        if (active) {
          setData(json);
          setHasNextPage(json.results.length > 0);
          setLoading(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      })
      .catch((err) => {
        console.error("Client fetch error:", err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [currentPage, slug, initialData]);

  const results = data?.results || [];

  const handlePageChange = useCallback(
    (pageNum: number) => {
      if (pageNum < 1) return;
      router.push(`?page=${pageNum}`);
    },
    [router]
  );

  const isEndOfPages = !loading && !error && results.length === 0 && currentPage > 1;

  return (
    <div className="rk-page rk-app-surface px-4 pb-24 pt-20 text-white">
      <div className="rk-shell">
        <div className="mb-6 flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/60">
            Genre
          </p>
          <h1 className="text-2xl font-black text-white">
            Genre: <span className="text-cyan-200">{title}</span>
          </h1>
          {data && (
            <p className="text-xs text-white/55">
              Halaman {currentPage}
            </p>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="rk-state rounded-2xl px-4 py-8 text-center text-sm text-rose-300">
            Terjadi kesalahan saat memuat data. Silakan coba lagi nanti.
          </div>
        ) : isEndOfPages ? (
          <div className="rk-state rounded-2xl px-5 py-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <p className="text-sm leading-6 text-white/60">
              Tidak ada komik lagi di halaman ini.
            </p>
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Kembali ke Halaman {currentPage - 1}
            </Button>
          </div>
        ) : results.length === 0 ? (
          <div className="rk-state rounded-2xl px-5 py-8 text-center">
            <p className="text-sm leading-6 text-white/60">
              Tidak ada komik yang ditemukan untuk genre ini.
            </p>
            <Button
              onClick={() => router.push("/genre")}
              className="mt-5 inline-flex rounded-full px-4 py-2 text-sm font-bold cursor-pointer"
            >
              Lihat Semua Genre
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {results.map((item, idx) => {
                const itemSlug = getSlugFromLink(item.link);
                const flag = typeFlag(item.typeGenre);

                return (
                  <SeriesCard
                    key={`${itemSlug}-${idx}`}
                    href={`/komik/komiku/${itemSlug}`}
                    title={item.title}
                    image={item.image}
                    badge={typeBadge(item.typeGenre)}
                    eyebrow={formatChapter(item.chapterLast)}
                    meta={formatChapter(item.chapterStart)}
                    corner={
                      flag ? (
                        <span className="absolute left-2 top-2 flex h-4 w-6 items-center justify-center overflow-hidden rounded-sm bg-transparent">
                          <img
                            src={flag.src}
                            alt={flag.label}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        </span>
                      ) : null
                    }
                  />
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-8 border-t border-white/5 pt-6">
              {/* Prev */}
              {currentPage > 1 ? (
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition cursor-pointer"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Prev
                </button>
              ) : (
                <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase border border-white/5 bg-white/[0.02] text-white/20 cursor-not-allowed">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Prev
                </span>
              )}

              {/* Page indicator */}
              <span className="flex items-center gap-2 text-xs font-bold text-white/50">
                <span className="flex h-7 min-w-[2rem] items-center justify-center rounded-lg bg-[var(--accent)] px-2.5 text-xs font-extrabold text-white">
                  {currentPage}
                </span>
              </span>

              {/* Next */}
              {hasNextPage ? (
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition cursor-pointer"
                >
                  Next
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              ) : (
                <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase border border-white/5 bg-white/[0.02] text-white/20 cursor-not-allowed">
                  Next
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
