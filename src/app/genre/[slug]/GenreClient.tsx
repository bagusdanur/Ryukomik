"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SeriesCard from "@/components/SeriesCard";

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
  total: number;
  results: GenreResultItem[];
}

interface GenreClientProps {
  initialData: GenreResponse | null;
  slug: string;
  title: string;
}

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

  const currentPage = Number(searchParams.get("page") ?? "1");

  const [data, setData] = useState<GenreResponse | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (currentPage === 1 && initialData) {
      setData(initialData);
      setLoading(false);
      setError(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(false);

    fetch(`https://api.ryukomik.web.id/genre/${slug}?page=${currentPage}`)
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat data");
        return res.json();
      })
      .then((json) => {
        if (active) {
          setData(json);
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
    };
  }, [currentPage, slug, initialData]);

  const results = data?.results || [];
  const totalPages = data?.total || 1;

  const handlePageChange = (pageNum: number) => {
    router.push(`?page=${pageNum}`);
  };

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
              Menampilkan Halaman {currentPage} dari {totalPages}
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
        ) : results.length === 0 ? (
          <div className="rk-state rounded-2xl px-5 py-8 text-center">
            <p className="text-sm leading-6 text-white/60">
              Tidak ada komik yang ditemukan untuk genre ini.
            </p>
            <button
              onClick={() => router.push("/genre")}
              className="rk-btn-primary mt-5 inline-flex rounded-full px-4 py-2 text-sm font-bold cursor-pointer"
            >
              Lihat Semua Genre
            </button>
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
            {totalPages > 1 && (
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

                {/* Page numbers */}
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
                    let pages: number[] = [];
                    if (totalPages <= 5) {
                      pages = Array.from({ length: totalPages }, (_, i) => i + 1);
                    } else if (currentPage <= 3) {
                      pages = [1, 2, 3, 4, 5];
                    } else if (currentPage >= totalPages - 2) {
                      pages = [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                    } else {
                      pages = [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
                    }

                    const pageNum = pages[idx];
                    const isActive = pageNum === currentPage;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`flex items-center justify-center font-extrabold transition text-xs cursor-pointer`}
                        style={{
                          width: isActive ? 28 : 24,
                          height: isActive ? 28 : 24,
                          borderRadius: isActive ? 8 : "50%",
                          background: isActive ? "var(--accent)" : "rgba(255,255,255,0.06)",
                          border: isActive ? "none" : "1px solid rgba(255,255,255,0.08)",
                          color: isActive ? "#ffffff" : "rgba(255,255,255,0.35)",
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                {/* Next */}
                {currentPage < totalPages ? (
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
