import Link from "next/link";

export const revalidate = 3600;

type OngoingAnime = {
  slug?: string;
  thumbnail?: string;
  title?: string;
  rarity?: number;
  isHot?: boolean;
  currentEpisode?: string | number;
  totalEpisode?: string | number;
};

type OngoingResult = {
  data: OngoingAnime[];
  total: number;
};

const EMPTY_RESULT = {
  data: [],
  total: 0,
} satisfies OngoingResult;

async function getData(): Promise<OngoingResult> {
  try {
    const res = await fetch("https://apiv2.ryukomik.web.id/animeid/ongoing", {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return EMPTY_RESULT;

    return (await res.json()) as OngoingResult;
  } catch (error) {
    console.error("Failed to fetch anime ongoing:", error);
    return EMPTY_RESULT;
  }
}

export default async function OngoingPage() {
  const result = await getData();
  const animeList = Array.isArray(result.data) ? result.data : [];
  const total = result.total || animeList.length;

  return (
    <div
      className="rk-page text-white pb-28 relative"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <div className="relative z-10 max-w-lg mx-auto">
        <div className="px-5 pt-7 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            <span className="text-[10px] font-semibold tracking-[.18em] uppercase text-cyan-200/70">
              Sedang Tayang
            </span>
          </div>

          <h1
            className="text-[32px] font-black leading-none tracking-tight mb-1"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Anime
            <br />
            <span className="text-cyan-200">Ongoing</span>
          </h1>
          <p className="text-xs text-white/25 font-light mb-5">
            Update terbaru setiap minggu
          </p>
        </div>

        <div className="flex items-center justify-between px-5 mb-3">
          <span
            className="text-sm font-black tracking-widest"
            style={{ fontFamily: "'Syne',sans-serif" }}
          >
            SEMUA SERIES
          </span>
          <span className="text-xs text-white/30">{total} tayang</span>
        </div>

        {animeList.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 px-5">
            {animeList.map((anime, i) => (
              <Link
                href={`/anime/detail/${anime.slug}`}
                key={anime.slug || i}
                prefetch={false}
                className="rk-card-soft group block overflow-hidden rounded-2xl"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="relative" style={{ aspectRatio: "2/3" }}>
                  <img
                    src={anime.thumbnail}
                    alt={anime.title}
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute top-1.5 left-1.5 right-1.5 flex justify-between items-start">
                    <div className="flex gap-0.5">
                      {[...Array(anime.rarity || 0)].map((_, j) => (
                        <div
                          key={j}
                          className="w-1 h-1 bg-yellow-400 rounded-full"
                        />
                      ))}
                    </div>
                    {anime.isHot && (
                      <div
                        className="text-[7px] font-bold px-1.5 py-0.5 rounded text-white"
                        style={{
                          background: "#ff4444",
                        }}
                      >
                        HOT
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#090a12] via-[#090a12]/85 to-transparent px-2 pb-2 pt-8">
                    <div className="flex items-baseline gap-1 mb-0.5">
                      <span
                        className="text-[13px] font-black text-[var(--accent-2)] leading-none"
                      >
                        EP {anime.currentEpisode}
                      </span>
                      <span className="text-[8px] text-white/30">
                        {anime.totalEpisode ? `/ ${anime.totalEpisode}` : "∞"}
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
          <div className="mx-5 rounded-2xl border border-white/10 bg-white/[.04] px-4 py-8 text-center">
            <p className="text-sm font-semibold text-white/70">
              Data anime ongoing belum bisa dimuat.
            </p>
            <p className="mt-1 text-xs text-white/35">
              Coba refresh lagi nanti.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
