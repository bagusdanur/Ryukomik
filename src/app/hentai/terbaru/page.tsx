import type { Metadata } from "next";
import Link from "next/link";
import { nekoImg } from "@/utils/neko";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Anime Dewasa Terbaru Sub Indo - Ryukomik",

  description:
    "Update anime dewasa terbaru sub indo kualitas HD dan episode terbaru lengkap di Ryukomik.",

  keywords: [
    "anime dewasa",
    "anime sub indo",
    "anime terbaru",
    "nekopoi",
    "ryukomik",
  ],

  alternates: {
    canonical: "https://ryukomik.my.id/hentai/terbaru",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    title: "Anime Dewasa Terbaru Sub Indo - Ryukomik",

    description:
      "Update anime dewasa terbaru sub indo kualitas HD di Ryukomik.",

    url: "https://ryukomik.my.id/hentai/terbaru",

    siteName: "Ryukomik",

    locale: "id_ID",

    type: "website",

    images: [
      {
        url: "https://ryukomik.my.id/og-hentai.jpg",
        width: 1200,
        height: 630,
        alt: "Anime Dewasa Ryukomik",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "Anime Dewasa Terbaru Sub Indo - Ryukomik",

    description:
      "Update anime dewasa terbaru sub indo di Ryukomik.",

    images: ["https://ryukomik.my.id/og-hentai.jpg"],
  },
};

type HentaiUpdateItem = {
  slug?: string;
  thumbnail?: string;
  title?: string;
  tag?: string;
  latestEpisode?: string | number | null;
};

type HentaiPagination = {
  hasPrev?: boolean;
  prevPage?: number;
  hasNext?: boolean;
  nextPage?: number;
  currentPage?: number;
  totalPages?: number;
};

type HentaiUpdateResponse = {
  data?: HentaiUpdateItem[];
  total?: number;
  pagination?: HentaiPagination;
};

type HentaiTerbaruProps = {
  searchParams: Promise<{ page?: string }>;
};

async function getData(page = 1): Promise<HentaiUpdateResponse> {
  const res = await fetch(`https://apiv2.ryukomik.web.id/nekopoi/terbaru?page=${page}`, {
    next: { revalidate: 120 },
  });
  if (!res.ok) throw new Error("Gagal fetch data");
  return (await res.json()) as HentaiUpdateResponse;
}

export default async function NekoTerbaruPage({ searchParams }: HentaiTerbaruProps) {
  const { page: pageParam } = await searchParams;
  const page = parseInt(pageParam || "1", 10) || 1;
  const result = await getData(page);
  const list = result.data ?? [];
  const pagination = result.pagination ?? {};

  return (
    <div
      className="rk-page text-white pb-28 relative"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <div className="relative z-10 max-w-lg mx-auto">

        {/* ── HERO ── */}
        <div className="px-5 pt-7 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff5078]" />
            <span className="text-[10px] font-semibold tracking-[.18em] uppercase text-[#ffb3c6]">
              Update Terbaru
            </span>
          </div>
          <h1
            className="text-[32px] font-black leading-none tracking-tight mb-1"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Hentai<br />
            <span className="text-[#ff5078]">Terbaru</span>
          </h1>
          <p className="text-xs text-white/25 font-light mb-5">Sub indo · update</p>
        </div>

        {/* ── LABEL ── */}
        <div className="flex items-center justify-between px-5 mb-3">
          <span
            className="text-sm font-black tracking-widest"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            SEMUA UPDATE
          </span>
          <span className="text-xs text-white/30">{result.total ?? list.length} episode</span>
        </div>

        {/* ── GRID ── */}
        <div className="grid grid-cols-3 gap-2 px-5">
          {list.map((item, i) => (
            <Link
              prefetch={false}
              href={`/hentai/episode/${item.slug}`}
              key={i}
              className="rk-card-soft group block overflow-hidden rounded-2xl"
            >
              <div className="relative" style={{ aspectRatio: "2/3" }}>
                <img
                  src={nekoImg(item.thumbnail)}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />

                {/* tag badge */}
                {item.tag && (
                  <div className="absolute top-1.5 left-1.5">
                    <div
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                      style={{
                        background:
                          item.tag === "UNCENSORED" ? "#f59e0b"
                          : item.tag === "4K" ? "#3b82f6"
                          : item.tag === "3D" || item.tag === "L2D" ? "#8b5cf6"
                          : "#ff5078",
                      }}
                    >
                      <span className="text-[7px] font-black text-white tracking-wide leading-none">
                        {item.tag === "NEW Release" ? "NEW" : item.tag}
                      </span>
                    </div>
                  </div>
                )}

                {/* ep badge */}
                {item.latestEpisode !== null && (
                  <div className="absolute top-1.5 right-1.5">
                    <div
                      className="px-1.5 py-0.5 rounded-md"
                      style={{ background: "rgba(0,0,0,0.6)" }}
                    >
                      <span className="text-[7px] font-black text-white/80 tracking-wide leading-none">
                        EP {item.latestEpisode}
                      </span>
                    </div>
                  </div>
                )}

                {/* bottom info */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#090a12] via-[#090a12]/85 to-transparent px-2 pb-2 pt-8">
                  <div className="flex items-center gap-1 mb-1">
                    <div
                      className="w-1 h-1 rounded-full"
                      style={{ background: "#ff5078" }}
                    />
                    <span className="text-[7px] font-semibold text-white/50 tracking-widest uppercase">
                      Terbaru
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

        {/* ── PAGINATION ── */}
        <div className="flex items-center justify-center gap-3 px-5 mt-6">
          {pagination.hasPrev ? (
            <Link
              href={`/hentai/terbaru?page=${pagination.prevPage}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white/70 border border-white/10 hover:border-[#ff5078]/40 hover:text-white transition-colors duration-200"
            >
              ← Prev
            </Link>
          ) : (
            <div className="px-4 py-2 rounded-xl text-xs font-bold text-white/20 border border-white/5 cursor-not-allowed">
              ← Prev
            </div>
          )}

          <span className="text-xs text-white/30">
            {pagination.currentPage} / {pagination.totalPages}
          </span>

          {pagination.hasNext ? (
            <Link
              href={`/hentai/terbaru?page=${pagination.nextPage}`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white/70 border border-white/10 hover:border-[#ff5078]/40 hover:text-white transition-colors duration-200"
            >
              Next →
            </Link>
          ) : (
            <div className="px-4 py-2 rounded-xl text-xs font-bold text-white/20 border border-white/5 cursor-not-allowed">
              Next →
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
