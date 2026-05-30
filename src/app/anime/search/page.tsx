import Link from "next/link";
import SearchBar from "./SearchBar";

const API_BASE = "https://api.ryukomik.my.id";

type SearchParams = Promise<{
  q?: string | string[];
  page?: string | string[];
}>;

type AnimeSearchItem = {
  slug: string;
  title?: string;
  thumbnail?: string;
  rating?: string | number;
  type?: string;
  season?: string;
};

type AnimeSearchResult = {
  data?: AnimeSearchItem[];
  totalResults?: number;
  totalPages?: number;
  hasPrev?: boolean;
  hasNext?: boolean;
};

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function searchAnime(query: string, page = 1): Promise<AnimeSearchResult | null> {
  if (!query || query.trim().length < 2) return null;

  const params = new URLSearchParams();
  params.append("q", query.trim());
  if (page > 1) params.append("page", String(page));

  const res = await fetch(`${API_BASE}/animeid/search?${params.toString()}`, {
    next: { revalidate: 300, tags: [`search-${query}-${page}`] },
  });

  if (!res.ok) return null;
  return (await res.json()) as AnimeSearchResult;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedParams = await searchParams;
  const query = firstParam(resolvedParams?.q);
  const page = parseInt(firstParam(resolvedParams?.page), 10) || 1;

  const result = query ? await searchAnime(query, page) : null;
  const animeList = result?.data || [];
  const hasResults = animeList.length > 0;

  return (
    <div
      className="min-h-screen bg-[#282828] text-white pb-24"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <div className="max-w-lg mx-auto">
        {/* ── HERO ── */}
        <div className="px-5 pt-6 pb-2">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#7d5fff]" />
            <span className="text-[9px] font-bold tracking-[.2em] uppercase text-[#b59bff]">
              Pencarian
            </span>
          </div>

          <h1
            className="text-[28px] font-black leading-none tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Cari
            <br />
            <span className="text-[#7d5fff]">Anime</span>
          </h1>

          {query && (
            <p className="text-[11px] text-white/30 mt-1.5">
              Hasil untuk {query}
            </p>
          )}
        </div>

        {/* ── SEARCH BAR ── */}
        <div className="px-5 mb-5">
          <SearchBar initialQuery={query} />
        </div>

        {/* ── RESULTS ── */}
        {query && (
          <>
            {/* Section label */}
            <div className="flex items-center justify-between px-5 mb-3">
              <span
                className="text-[11px] font-black tracking-[.15em] uppercase"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {hasResults ? "Hasil Pencarian" : "Tidak Ditemukan"}
              </span>
              {hasResults && (
                <span className="text-[10px] text-white/25 font-medium">
                  {result?.totalResults ?? animeList.length} anime
                </span>
              )}
            </div>

            {hasResults ? (
              <div className="grid grid-cols-3 gap-2 px-5">
                {animeList.map((anime) => (
                  <Link
                    prefetch={false}
                    href={`/anime/detail/${anime.slug}`}
                    key={anime.slug}
                    className="group block rounded-2xl overflow-hidden border border-white/5 bg-[#1c1c1c]"
                  >
                    <div className="relative" style={{ aspectRatio: "2/3" }}>
                      <img
                        src={anime.thumbnail}
                        alt={anime.title ?? "Anime"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />

                      {/* Rating badge */}
                      {anime.rating && (
                        <div className="absolute top-3 left-2">
                          <div className="flex items-center gap-1">
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="#fbbf24"
                              className="flex-shrink-0"
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span
                              className="text-[11px] font-black text-yellow-400 tracking-wide leading-none"
                              style={{
                                WebkitTextStroke: "0.3px rgba(0,0,0,0.5)",
                              }}
                            >
                              {anime.rating}
                            </span>
                          </div>
                        </div>
                      )}
                      {/* Type badge */}
                      {anime.type && (
                        <div className="absolute top-1 right-2">
                          <span
                            className="text-[10px] font-black text-white/90 tracking-widest uppercase leading-none"
                            style={{
                              WebkitTextStroke: "0.4px rgba(0,0,0,0.6)",
                            }}
                          >
                            {anime.type}
                          </span>
                        </div>
                      )}

                      {/* Bottom info */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#090a12] via-[#090a12]/85 to-transparent px-2 pb-2 pt-8">
                        {/* Season */}
                        <div className="flex items-center gap-1 mb-1">
                          <div
                            className="w-1 h-1 rounded-full"
                            style={{ background: "#4ade80" }}
                          />
                          <span className="text-[7px] font-semibold text-white/50 tracking-widest uppercase">
                            {anime.season && anime.season !== "NO SEASON"
                              ? anime.season
                              : "TBA"}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-white leading-snug line-clamp-2">
                          {anime.title}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="px-5 py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#1c1c1c] border border-white/5 flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-white/20"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <p className="text-sm text-white/30 font-medium mb-1">
                  &quot;{query}&quot; tidak ditemukan
                </p>
                <p className="text-xs text-white/15">
                  Coba cari dengan kata kunci lain
                </p>
              </div>
            )}

            {/* Pagination */}
            {result && result.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-5 px-5">
                {result.hasPrev && (
                  <Link
                    href={`/anime/search?q=${encodeURIComponent(query)}&page=${page - 1}`}
                    className="px-3 py-2 rounded-lg bg-[#16162a] border border-white/[0.06] text-[10px] font-bold text-white/40 hover:text-white/70"
                  >
                    ← Prev
                  </Link>
                )}
                <span className="text-[10px] text-white/25 font-medium">
                  {page} / {result.totalPages}
                </span>
                {result.hasNext && (
                  <Link
                    href={`/anime/search?q=${encodeURIComponent(query)}&page=${page + 1}`}
                    className="px-3 py-2 rounded-lg bg-[#16162a] border border-white/[0.06] text-[10px] font-bold text-white/40 hover:text-white/70"
                  >
                    Next →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
