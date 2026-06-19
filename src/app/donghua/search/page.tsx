import Link from "next/link";
import SearchBar from "./SearchBar";

const API_BASE = "https://apiv2.ryukomik.web.id";

type SearchParams = Promise<{
  q?: string | string[];
  page?: string | string[];
}>;

type DonghuaSearchItem = {
  title: string;
  episodeTitle?: string;
  slug: string;
  url?: string;
  thumbnail: string;
  type?: string;
  episode?: number | string | null;
  episodeLabel?: string;
  isEnd?: boolean;
  isMovie?: boolean;
  subDub?: string;
  status?: string;
};

type DonghuaSearchResult = {
  data?: DonghuaSearchItem[];
  totalPages?: number;
  totalResults?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  nextPage?: number | null;
  prevPage?: number | null;
};

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function searchDonghua(query: string, page = 1): Promise<DonghuaSearchResult | null> {
  if (!query || query.trim().length < 2) return null;

  const params = new URLSearchParams();
  params.append("q", query.trim());
  if (page > 1) params.append("page", String(page));

  const res = await fetch(`${API_BASE}/anichin/search?${params.toString()}`, {
    next: { revalidate: 300, tags: [`search-donghua-${query}-${page}`] },
  });

  if (!res.ok) return null;
  return (await res.json()) as DonghuaSearchResult;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedParams = await searchParams;
  const query = firstParam(resolvedParams?.q);
  const page = parseInt(firstParam(resolvedParams?.page), 10) || 1;

  const result = query ? await searchDonghua(query, page) : null;
  const donghuaList = result?.data || [];
  const hasResults = donghuaList.length > 0;

  return (
    <div
      className="min-h-screen bg-[#282828] text-white pb-24"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <div className="max-w-lg mx-auto">
        {/* ── HERO ── */}
        <div className="px-5 pt-6 pb-2">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff9f1c]" />
            <span className="text-[9px] font-bold tracking-[.2em] uppercase text-[#ffb547]">
              Pencarian
            </span>
          </div>

          <h1
            className="text-[28px] font-black leading-none tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Cari
            <br />
            <span className="text-[#ff9f1c]">Donghua</span>
          </h1>

          {query && (
            <p className="text-[11px] text-white/30 mt-1.5">
              Hasil untuk &quot;{query}&quot;
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
                  {result?.totalResults ?? donghuaList.length} donghua
                </span>
              )}
            </div>

            {hasResults ? (
              <div className="grid grid-cols-3 gap-2 px-5">
                {donghuaList.map((donghua) => (
                  <Link
                    prefetch={false}
                    href={`/donghua/detail/${donghua.slug}`}
                    key={donghua.slug}
                    className="group block rounded-2xl overflow-hidden border border-white/5 bg-[#1c1c1c] active:scale-95 transition-transform"
                  >
                    <div className="relative" style={{ aspectRatio: "2/3" }}>
                      <img
                        src={donghua.thumbnail}
                        alt={donghua.title ?? "Donghua"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />

                      {/* Episode Label badge */}
                      {donghua.episodeLabel && (
                        <div className="absolute top-1.5 left-1.5">
                          <div
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                            style={{ background: "#ff9f1c" }}
                          >
                            <span className="text-[8px] font-black text-black tracking-wide leading-none uppercase">
                              {donghua.episodeLabel}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Status / Completed badge */}
                      {donghua.status === "Completed" && (
                        <div className="absolute top-1.5 right-1.5">
                          <div className="px-1 py-0.5 rounded-md bg-black/60 border border-white/10">
                            <span className="text-[7px] font-bold text-white/60 tracking-wide leading-none">
                              END
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Bottom info */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#090a12] via-[#090a12]/85 to-transparent px-2 pb-2 pt-8">
                        {/* Sub/Dub status */}
                        <div className="flex items-center gap-1 mb-1">
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background: donghua.status === "Completed" ? "#888" : "#4ade80",
                            }}
                          />
                          <span className="text-[7px] font-semibold text-white/50 tracking-widest uppercase">
                            {donghua.subDub || "SUB"}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-white leading-snug line-clamp-2">
                          {donghua.title}
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
            {result && result.totalPages && result.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-5 px-5">
                {result.hasPrev && (
                  <Link
                    href={`/donghua/search?q=${encodeURIComponent(query)}&page=${page - 1}`}
                    className="px-3 py-2 rounded-lg bg-[#16162a] border border-white/[0.06] text-[10px] font-bold text-white/40 hover:text-white/70 hover:border-[#ff9f1c]/30"
                  >
                    ← Prev
                  </Link>
                )}
                <span className="text-[10px] text-white/25 font-medium">
                  {page} / {result.totalPages}
                </span>
                {result.hasNext && (
                  <Link
                    href={`/donghua/search?q=${encodeURIComponent(query)}&page=${page + 1}`}
                    className="px-3 py-2 rounded-lg bg-[#16162a] border border-white/[0.06] text-[10px] font-bold text-white/40 hover:text-white/70 hover:border-[#ff9f1c]/30"
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
