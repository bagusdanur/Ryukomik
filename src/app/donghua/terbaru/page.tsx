"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type DonghuaUpdateItem = {
  slug?: string;
  thumbnail?: string;
  title?: string;
  episode?: string | number | null;
  isMovie?: boolean;
  status?: string;
  type?: string;
  subDub?: string;
};

type DonghuaUpdateResponse = {
  data?: DonghuaUpdateItem[];
  hasNext?: boolean;
  hasPrev?: boolean;
  total?: number;
};

async function getData(page: number): Promise<DonghuaUpdateResponse> {
  const res = await fetch(`https://api.ryukomik.my.id/anichin/terbaru?page=${page}`, {
    next: { revalidate: 120 },
  });
  if (!res.ok) throw new Error("Gagal fetch data");
  return (await res.json()) as DonghuaUpdateResponse;
}

function LoadingSkeleton() {
  return (
    <div className="rk-page text-white pb-28" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className="relative z-10 max-w-lg mx-auto px-5 pt-7">
        <div className="grid grid-cols-3 gap-2 mt-20">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-white/5" style={{ aspectRatio: "2/3" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DonghuaTerbaruContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentPage = Number(searchParams.get("page") ?? "1");

  const [result, setResult] = useState<DonghuaUpdateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = requestAnimationFrame(() => setLoading(true));
    getData(currentPage)
      .then((data) => {
        setResult(data);
        setLoading(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch(() => setLoading(false));
    return () => cancelAnimationFrame(id);
  }, [currentPage]);

  const list = result?.data ?? [];
  const hasNext = result?.hasNext ?? false;
  const hasPrev = result?.hasPrev ?? false;
  const total = result?.total ?? 0;

  const goToPage = (page: number) => {
    router.push(`?page=${page}`);
  };

  return (
    <div
      className="rk-page text-white pb-28 relative"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <div className="relative z-10 max-w-lg mx-auto">

        {/* ── HERO ── */}
        <div className="px-5 pt-7 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#ff9f1c" }}
            />
            <span className="text-[10px] font-semibold tracking-[.18em] uppercase text-[#ffb347]">
              Update Terbaru
            </span>
          </div>

          <h1
            className="text-[32px] font-black leading-none tracking-tight mb-1"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Donghua<br />
            <span style={{ color: "#ff9f1c" }}>Terbaru</span>
          </h1>
          <p className="text-xs text-white/25 font-light mb-5">Sub indo · update</p>
        </div>

        {/* ── SECTION LABEL ── */}
        <div className="flex items-center justify-between px-5 mb-3">
          <span
            className="text-sm font-black tracking-widest"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            SEMUA UPDATE
          </span>
          <span className="text-xs text-white/30">
            {loading ? "..." : `${list.length} episode`}
          </span>
        </div>

        {/* ── GRID ── */}
        {loading ? (
          <div className="grid grid-cols-3 gap-2 px-5">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden bg-white/5"
                style={{ aspectRatio: "2/3" }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 px-5">
            {list.map((item, i) => (
              <Link
                prefetch={false}
                href={`/donghua/episode/${item.slug}`}
                key={i}
                className="rk-card-soft group block overflow-hidden rounded-2xl"
              >
                <div className="relative" style={{ aspectRatio: "2/3" }}>
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />

                  {/* ep badge */}
                  {item.episode !== null && (
                    <div className="absolute top-1.5 left-1.5">
                      <div
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                        style={{ background: "#ff9f1c" }}
                      >
                        <span className="text-[8px] font-black text-black tracking-wide leading-none">
                          {item.isMovie ? "MOVIE" : `EP ${item.episode}`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* status badge: Completed */}
                  {item.status === "Completed" && (
                    <div className="absolute top-1.5 right-1.5">
                      <div className="px-1 py-0.5 rounded-md bg-black/60 border border-white/10">
                        <span className="text-[7px] font-bold text-white/60 tracking-wide leading-none">
                          END
                        </span>
                      </div>
                    </div>
                  )}

                  {/* type badge */}
                  {item.type && item.type !== "Donghua" && (
                    <div className="absolute bottom-12 left-2">
                      <span className="text-[7px] font-bold text-white/40 tracking-widest uppercase">
                        {item.type}
                      </span>
                    </div>
                  )}

                  {/* bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#090a12] via-[#090a12]/85 to-transparent px-2 pb-2 pt-8">
                    <div className="flex items-center gap-1 mb-0.5">
                      <div
                        className="w-1 h-1 rounded-full"
                        style={{
                          background: item.status === "Completed" ? "#888" : "#4ade80",
                        }}
                      />
                      <span className="text-[7px] font-semibold text-white/40 tracking-widest uppercase">
                        {item.subDub}
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
        )}

        {/* ── PAGINATION ── */}
        {!loading && (hasPrev || hasNext) && (
          <div className="flex items-center justify-between px-5 mt-6">
            {/* Prev */}
            <button
              onClick={() => hasPrev && goToPage(currentPage - 1)}
              disabled={!hasPrev}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase"
              style={{
                background: hasPrev ? "rgba(255,159,28,0.12)" : "rgba(255,255,255,0.04)",
                color: hasPrev ? "#ff9f1c" : "rgba(255,255,255,0.2)",
                border: hasPrev ? "1px solid rgba(255,159,28,0.25)" : "1px solid rgba(255,255,255,0.06)",
                cursor: hasPrev ? "pointer" : "not-allowed",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Prev
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(total, 5) }).map((_, idx) => {
                const totalPages = total;
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

                const page = pages[idx];
                const isActive = page === currentPage;

                return (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className=""
                    style={{
                      width: isActive ? 28 : 22,
                      height: isActive ? 28 : 22,
                      borderRadius: isActive ? 8 : "50%",
                      background: isActive ? "#ff9f1c" : "rgba(255,255,255,0.06)",
                      border: isActive ? "none" : "1px solid rgba(255,255,255,0.08)",
                      color: isActive ? "#000" : "rgba(255,255,255,0.35)",
                      fontSize: 9,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            {/* Next */}
            <button
              onClick={() => hasNext && goToPage(currentPage + 1)}
              disabled={!hasNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold tracking-widest uppercase"
              style={{
                background: hasNext ? "rgba(255,159,28,0.12)" : "rgba(255,255,255,0.04)",
                color: hasNext ? "#ff9f1c" : "rgba(255,255,255,0.2)",
                border: hasNext ? "1px solid rgba(255,159,28,0.25)" : "1px solid rgba(255,255,255,0.06)",
                cursor: hasNext ? "pointer" : "not-allowed",
              }}
            >
              Next
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* Page info */}
        {!loading && total > 1 && (
          <p className="text-center text-[10px] text-white/20 mt-3 mb-2 tracking-widest">
            Halaman {currentPage} dari {total}
          </p>
        )}

      </div>
    </div>
  );
}

export default function DonghuaTerbaruPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DonghuaTerbaruContent />
    </Suspense>
  );
}
