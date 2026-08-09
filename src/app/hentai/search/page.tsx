import Link from "next/link";
import { nekoImg } from "@/utils/neko";
import HentaiSearchBar from "./SearchBar";

type SearchParams = Promise<{
  q?: string | string[];
  page?: string | string[];
}>;

type HentaiSearchItem = {
  slug: string;
  title?: string;
  thumbnail?: string;
  tag?: string;
  latestEpisode?: string | number | null;
};

type HentaiSearchPagination = {
  currentPage?: number;
  totalPages?: number;
  hasPrev?: boolean;
  hasNext?: boolean;
  prevPage?: number;
  nextPage?: number;
};

type HentaiSearchResult = {
  data?: HentaiSearchItem[];
  total?: number;
  pagination?: HentaiSearchPagination;
};

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function searchHentai(query: string, page = 1): Promise<HentaiSearchResult | null> {
  if (!query || query.trim().length < 2) return null;

  const params = new URLSearchParams();
  params.append("q", query.trim());
  if (page > 1) params.append("page", String(page));

  const res = await fetch(
    `https://apiv2.ryukomik.web.id/nekopoi/search?${params.toString()}`,
    { next: { revalidate: 300 } },
  );
  if (!res.ok) return null;
  return (await res.json()) as HentaiSearchResult;
}

export default async function HentaiSearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedParams = await searchParams;
  const query = firstParam(resolvedParams?.q);
  const page = parseInt(firstParam(resolvedParams?.page), 10) || 1;

  const result = query ? await searchHentai(query, page) : null;
  const list = result?.data || [];
  const hasResults = list.length > 0;
  const pagination = result?.pagination ?? {};

  return (
    <div
      className="min-h-screen bg-[var(--surface-1)] text-white pb-24"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <div className="max-w-lg mx-auto">
        {/* ── HERO ── */}
        <div className="px-5 pt-6 pb-2">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff5078]" />
            <span className="text-[9px] font-bold tracking-[.2em] uppercase text-[#ffb3c6]">
              Pencarian
            </span>
          </div>
          <h1
            className="text-[28px] font-black leading-none tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Cari
            <br />
            <span className="text-[#ff5078]">Hentai</span>
          </h1>
          {query && (
            <p className="text-[11px] text-white/30 mt-1.5">
              Hasil untuk &quot;{query}&quot;
            </p>
          )}
        </div>

        {/* ── SEARCH BAR ── */}
        <div className="px-5 mb-5">
          <HentaiSearchBar initialQuery={query} />
        </div>

        {/* ── RESULTS ── */}
        {query && (
          <>
            <div className="flex items-center justify-between px-5 mb-3">
              <span
                className="text-[11px] font-black tracking-[.15em] uppercase"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {hasResults ? "Hasil Pencarian" : "Tidak Ditemukan"}
              </span>
              {hasResults && (
                <span className="text-[10px] text-white/25 font-medium">
                  {result?.total ?? list.length} hasil
                </span>
              )}
            </div>

            {hasResults ? (
              <div className="grid grid-cols-3 gap-2 px-5">
                {list.map((item) => (
                  <Link
                    prefetch={false}
                    href={`/hentai/episode/${item.slug}`}
                    key={item.slug}
                    className="group block rounded-2xl overflow-hidden border border-white/5 bg-[var(--surface-1)]"
                  >
                    <div className="relative" style={{ aspectRatio: "2/3" }}>
                      <img
                        src={nekoImg(item.thumbnail)}
                        alt={item.title ?? "Hentai"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />

                      {/* tag + ep badge */}
                      <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between">
                        {item.tag ? (
                          <span
                            className="text-[6px] font-black text-white tracking-wide leading-none px-1 py-0.5 rounded"
                            style={{
                              background:
                                item.tag === "UNCENSORED"
                                  ? "#f59e0b"
                                  : item.tag === "4K"
                                    ? "#3b82f6"
                                    : item.tag === "3D" || item.tag === "L2D"
                                      ? "#8b5cf6"
                                      : "#ff5078",
                            }}
                          >
                            {item.tag === "NEW Release" ? "NEW" : item.tag}
                          </span>
                        ) : (
                          <div />
                        )}

                        {item.latestEpisode !== null && (
                          <span
                            className="text-[6px] font-black text-white/70 tracking-wide leading-none px-1 py-0.5 rounded"
                            style={{ background: "rgba(0,0,0,0.55)" }}
                          >
                            EP {item.latestEpisode}
                          </span>
                        )}
                      </div>

                      {/* bottom info */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#090a12] via-[#090a12]/85 to-transparent px-2 pb-2 pt-8">
                        <div className="flex items-center gap-1 mb-1">
                          <div
                            className="w-1 h-1 rounded-full"
                            style={{ background: "#ff5078" }}
                          />
                          <span className="text-[7px] font-semibold text-white/50 tracking-widest uppercase">
                            Hentai
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-white leading-snug line-clamp-2">
                            {item.title}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-5 py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--surface-1)] border border-white/5 flex items-center justify-center">
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

            {/* ── PAGINATION ── */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-5 px-5">
                {pagination.hasPrev ? (
                  <Link
                    href={`/hentai/search?q=${encodeURIComponent(query)}&page=${pagination.prevPage}`}
                    className="px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-white/5 text-[10px] font-bold text-white/40 hover:text-white/70 hover:border-[#ff5078]/30 transition-colors duration-200"
                  >
                    ← Prev
                  </Link>
                ) : null}
                <span className="text-[10px] text-white/25 font-medium">
                  {pagination.currentPage} / {pagination.totalPages}
                </span>
                {pagination.hasNext ? (
                  <Link
                    href={`/hentai/search?q=${encodeURIComponent(query)}&page=${pagination.nextPage}`}
                    className="px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-white/5 text-[10px] font-bold text-white/40 hover:text-white/70 hover:border-[#ff5078]/30 transition-colors duration-200"
                  >
                    Next →
                  </Link>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
