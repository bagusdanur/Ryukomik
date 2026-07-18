import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Anime Terbaru Sub Indo - Ryukomik",

  description:
    "Nonton dan lihat update anime terbaru sub indo lengkap dengan episode terbaru kualitas HD di Ryukomik.",

  keywords: [
    "anime terbaru",
    "anime sub indo",
    "anime ongoing",
    "nonton anime",
    "anime indo",
    "ryukomik anime",
  ],

  alternates: {
    canonical: "https://ryukomik.my.id/anime/terbaru",
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
    title: "Anime Terbaru Sub Indo - Ryukomik",

    description:
      "Update anime terbaru sub indo dan ongoing setiap hari di Ryukomik.",

    url: "https://ryukomik.my.id/anime/terbaru",

    siteName: "Ryukomik",

    locale: "id_ID",

    type: "website",

    images: [
      {
        url: "https://ryukomik.my.id/og-anime.jpg",
        width: 1200,
        height: 630,
        alt: "Anime Terbaru Ryukomik",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "Anime Terbaru Sub Indo - Ryukomik",

    description:
      "Nonton dan update anime terbaru sub indo kualitas HD di Ryukomik.",

    images: ["https://ryukomik.my.id/og-anime.jpg"],
  },
};

type AnimeUpdateItem = {
  slug?: string;
  thumbnail?: string;
  title?: string;
  latestEpisode?: string | number | null;
};

type AnimeUpdateResponse = {
  data?: AnimeUpdateItem[];
  total?: number;
};

async function getData(): Promise<AnimeUpdateResponse> {
  try {
    const res = await fetch(
      "https://apiv2.ryukomik.web.id/animeid/terbaru",
      {
        next: { revalidate: 120 },
      }
    );

    if (!res.ok) return { data: [], total: 0 };

    return (await res.json()) as AnimeUpdateResponse;
  } catch (error) {
    return { data: [], total: 0 };
  }
}

export default async function TerbaruPage() {
  const result = await getData();

  const animeList = result.data ?? [];

  return (
    <div
      className="rk-page text-white pb-28 relative"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <div className="relative z-10 max-w-lg mx-auto">

        {/* SEO H1 */}
        <h1 className="sr-only">
          Anime Terbaru Sub Indo
        </h1>

        {/* HERO */}
        <div className="px-5 pt-7 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-300" />

            <span className="text-[10px] font-semibold tracking-[.18em] uppercase text-cyan-200/70">
              Update Terbaru
            </span>
          </div>

          <h2
            className="text-[32px] font-black leading-none tracking-tight mb-1"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Episode
            <br />
            <span className="text-cyan-200">
              Terbaru
            </span>
          </h2>

          <p className="text-xs text-white/25 font-light mb-5">
            Sub indo · update
          </p>
        </div>

        {/* SECTION */}
        <div className="flex items-center justify-between px-5 mb-3">
          <span
            className="text-sm font-black tracking-widest"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            SEMUA UPDATE
          </span>

          <span className="text-xs text-white/30">
            {result.total ?? animeList.length} episode
          </span>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-3 gap-2 px-5">
          {animeList.map((anime, i) => (
            <Link
              prefetch={false}
              href={`/anime/detail/${anime.slug}`}
              key={i}
              className="rk-card-soft group block overflow-hidden rounded-2xl"
            >
              <div
                className="relative"
                style={{ aspectRatio: "2/3" }}
              >
                <img
                  src={anime.thumbnail}
                  alt={`${anime.title} Sub Indo`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />

                {anime.latestEpisode !== null && (
                  <div className="absolute top-1.5 left-1.5">
                    <div className="flex items-center gap-1 rounded-md bg-violet-500 px-1.5 py-0.5">
                      <span className="text-[8px] font-black text-white tracking-wide leading-none">
                        EP {anime.latestEpisode}
                      </span>
                    </div>
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#090a12] via-[#090a12]/85 to-transparent px-2 pb-2 pt-8">
                  <div className="flex items-center gap-1 mb-1">
                    <div
                      className="w-1 h-1 rounded-full"
                      style={{
                        background: "#4ade80",
                      }}
                    />

                    <span className="text-[7px] font-semibold text-white/50 tracking-widest uppercase">
                      Terbaru
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
      </div>
    </div>
  );
}
