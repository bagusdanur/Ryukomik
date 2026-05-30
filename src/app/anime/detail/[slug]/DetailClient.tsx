"use client";
import Link from "next/link";
import { useState, useMemo } from "react";

type AnimeGenre = {
  name?: string;
  slug?: string;
};

type AnimeEpisode = {
  title?: string;
  label?: string;
  slug?: string;
  date?: string;
};

type NumberedAnimeEpisode = AnimeEpisode & {
  title: string;
  num: number;
};

type AnimeDetail = {
  title?: string;
  thumbnail?: string;
  status?: string;
  score?: string | number;
  type?: string;
  totalEpisode?: string | number;
  studio?: string;
  genres?: AnimeGenre[];
  firstEpisode?: AnimeEpisode;
  lastEpisode?: AnimeEpisode;
  synopsis?: string;
  episodeList?: AnimeEpisode[];
};

type DetailClientProps = {
  data: AnimeDetail | null;
  slug: string;
};

function getEpisodeNumber(ep: AnimeEpisode | undefined, fallback: number): number {
  const text = `${ep?.title ?? ""} ${ep?.slug ?? ""}`;
  const match = text.match(/episode[-\s]*(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : fallback;
}

export default function DetailClient({ data, slug }: DetailClientProps) {
  const [synopsisOpen, setSynopsisOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [loadingEpisode, setLoadingEpisode] = useState("");

  const filteredEpisodes = useMemo(() => {
    const episodes = Array.isArray(data?.episodeList) ? data.episodeList : [];
    const fallbackEpisodes = [data?.lastEpisode, data?.firstEpisode].filter(
      (ep, idx, arr) =>
        ep?.slug && arr.findIndex((item) => item?.slug === ep.slug) === idx
    );

    let list: NumberedAnimeEpisode[] =
      (episodes.length ? episodes : fallbackEpisodes).map((ep, idx, arr) => ({
        ...ep,
        title:
          ep.title || ep.label || `Episode ${getEpisodeNumber(ep, arr.length - idx)}`,
        num: getEpisodeNumber(ep, arr.length - idx),
      })) ?? [];

    const keyword = search.trim().toLowerCase();
    if (keyword)
      list = list.filter(
        (ep) =>
          ep.title.toLowerCase().includes(keyword) ||
          ep.slug?.toLowerCase().includes(keyword) ||
          String(ep.num).includes(keyword),
      );

    list = [...list].sort((a, b) => (sortAsc ? a.num - b.num : b.num - a.num));

    return list;
  }, [data, search, sortAsc]);

  // error state ditangani di server
  if (!data)
    return (
      <div className="rk-page flex flex-col items-center justify-center gap-3 text-white">
        <div className="text-4xl">😵</div>
        <p className="font-black uppercase tracking-widest text-sm">
          Anime tidak ditemukan
        </p>
        <Link
          prefetch={false}
          href="/anime/terbaru"
          className="text-xs text-cyan-200 underline underline-offset-4"
        >
          Kembali
        </Link>
      </div>
    );

  const cleanTitle = (data.title ?? slug).replace("Nonton ", "").replace(" Sub Indo", "");

  return (
    <div
      className="rk-page text-white pb-28 relative"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {loadingEpisode && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#151515] px-6 text-center">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full border-4 border-white/10" />
            <div className="absolute inset-0 rounded-full border-4 border-cyan-300" />
            <div className="absolute inset-3 rounded-full bg-cyan-400/20" />
          </div>
          <div>
            <p
              className="text-[12px] font-black uppercase tracking-[.18em] text-white"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Memuat Episode
            </p>
            <p className="mt-1 text-[10px] font-semibold text-white/35">
              {loadingEpisode}
            </p>
          </div>
        </div>
      )}
    

      <div className="relative z-10 max-w-lg mx-auto">
        {/* ── BACK NAV ── */}
        <div className="px-5 pt-7 mb-5">
          <Link
          prefetch={false}
            href="/anime/terbaru"
            className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[.15em] uppercase text-white/35 hover:text-cyan-200"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Kembali
          </Link>
        </div>

        {/* ── HERO SECTION ── */}
        <div className="px-5 mb-6">
          {/* label */}
          <div className="flex items-center gap-2 mb-3">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            <span className="text-[10px] font-semibold tracking-[.18em] uppercase text-cyan-200/70">
              {data.status}
            </span>
          </div>

          {/* poster + meta */}
          <div className="flex gap-4">
            {/* Poster */}
            <div className="relative shrink-0 group">
              <div className="w-[110px] aspect-[2/3] rounded-2xl overflow-hidden border border-white/[0.08]">
                <img
                  src={data.thumbnail}
                  alt={cleanTitle}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Score badge */}
              <div className="absolute -bottom-2.5 -right-2.5 flex items-center gap-1 bg-cyan-600 text-white text-[10px] font-black px-2 py-1 rounded-xl border border-white/10">
                <svg
                  className="w-2.5 h-2.5 text-yellow-300"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {data.score}
              </div>
            </div>

            {/* Meta info */}
            <div className="flex-1 pt-1">
              <h1
                className="text-[20px] font-black leading-tight tracking-tight mb-2"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {cleanTitle}
              </h1>

              {/* Stats row */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
                {data.type && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-white/20 uppercase tracking-widest">
                      Type
                    </span>
                    <span className="text-[10px] font-bold text-white/70">
                      {data.type}
                    </span>
                  </div>
                )}
                {data.totalEpisode && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-white/20 uppercase tracking-widest">
                      Ep
                    </span>
                    <span className="text-[10px] font-bold text-white/70">
                      {data.totalEpisode}
                    </span>
                  </div>
                )}
                {data.studio && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-white/20 uppercase tracking-widest">
                      Studio
                    </span>
                    <span className="text-[10px] font-bold text-cyan-200">
                      {data.studio}
                    </span>
                  </div>
                )}
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-1">
                {data.genres?.map((genre, idx) => (
                  <span
                    key={genre.slug ?? `${genre.name}-${idx}`}
                    className="text-[8px] font-bold px-2 py-0.5 rounded-full border border-white/8 bg-white/5 text-white/40 uppercase tracking-wider"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── ACTION BUTTONS ── */}
        <div className="px-5 grid grid-cols-2 gap-2 mb-6">
          <Link
            prefetch={false}
            href={`/anime/episode/${data.firstEpisode?.slug ?? ""}`}
            onClick={() => setLoadingEpisode(data.firstEpisode?.title || "Episode 1")}
            className="rk-btn-ghost group flex items-center justify-center gap-2 rounded-2xl py-3.5 active:scale-95"
          >
            <div className="w-2 h-2 bg-white/20 rounded-full group-hover:bg-white/50" />
            <span
              className="text-[11px] font-black uppercase tracking-wider"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Episode 1
            </span>
          </Link>
          <Link
            prefetch={false}
            href={`/anime/episode/${data.lastEpisode?.slug ?? ""}`}
            onClick={() => setLoadingEpisode(data.lastEpisode?.title || "Episode terbaru")}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white active:scale-95"
            style={{ background: "#8b5cf6" }}
          >
            <span
              className="text-[11px] font-black uppercase tracking-wider"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Terbaru
            </span>
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>

        {/* ── SYNOPSIS ── */}
        <div className="px-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
            <span className="text-[10px] font-semibold tracking-[.18em] uppercase text-cyan-200/70">
              Sinopsis
            </span>
          </div>
          <div
            className={`relative overflow-hidden ${synopsisOpen ? "" : "max-h-[72px]"}`}
          >
            <p className="text-xs text-white/40 font-light leading-relaxed">
              {data.synopsis}
            </p>
            {!synopsisOpen && (
              <div
                className="absolute bottom-0 left-0 right-0 h-8"
                style={{ background: "rgba(40,40,40,0.86)" }}
              />
            )}
          </div>
          <button
            onClick={() => setSynopsisOpen((v) => !v)}
              className="text-[10px] font-bold text-[#7d5fff] mt-2 uppercase tracking-widest hover:text-[#b59bff]"
          >
            {synopsisOpen ? "Tutup ↑" : "Selengkapnya ↓"}
          </button>
        </div>

        {/* ── DIVIDER ── */}
        <div className="mx-5 h-px bg-white/5 mb-6" />

        {/* ── EPISODE LIST ── */}
        <div className="px-5">
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-sm font-black tracking-widest"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              LIST EPISODE
            </span>
            <span className="text-xs text-white/25">
              {filteredEpisodes.length} eps
            </span>
          </div>

          {/* Controls: Search + Sort */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Cari episode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1c1c1c] border border-white/5 focus:border-[#7d5fff]/40 rounded-xl pl-8 pr-3 py-2 text-[11px] font-bold text-white placeholder-white/20 outline-none"
                style={{ fontFamily: "'Syne', sans-serif" }}
              />
            </div>
            <button
              onClick={() => setSortAsc((p) => !p)}
              className="flex items-center gap-1.5 bg-[#1c1c1c] border border-white/5 hover:border-[#7d5fff]/30 rounded-xl px-3 py-2 text-[10px] font-black text-white/50 hover:text-white whitespace-nowrap"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {sortAsc ? "TERLAMA" : "TERBARU"}
              <svg
                className={`w-3 h-3 ${sortAsc ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </button>
          </div>

          {/* Scroll Box */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-80 pr-1 scrollbar-thin scrollbar-thumb-[#7d5fff]/30 scrollbar-track-transparent">
            {filteredEpisodes.length === 0 ? (
              <p
                className="text-center py-6 text-[11px] font-black text-white/20 tracking-widest uppercase"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Tidak ditemukan
              </p>
            ) : (
              filteredEpisodes.map((ep) => (
                <Link
                  prefetch={false}
                  key={ep.slug ?? `${ep.title}-${ep.num}`}
                  href={`/anime/episode/${ep.slug ?? ""}`}
                  onClick={() => setLoadingEpisode(ep.title)}
                  className="group flex items-center gap-3 p-3 rounded-2xl bg-[#1c1c1c] border border-white/5 hover:border-[#7d5fff]/30 hover:bg-[#7d5fff]/5"
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 group-hover:bg-[#7d5fff] shrink-0">
                    <span
                      className="text-[11px] font-black text-white/60 group-hover:text-white"
                      style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                      {ep.num}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[11px] font-black text-white/80 group-hover:text-white truncate uppercase tracking-tight"
                      style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                      {ep.title}
                    </p>
                    <p className="text-[9px] text-white/25 font-medium mt-0.5">
                      {ep.date}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 shrink-0">
                    <div className="w-7 h-7 rounded-full bg-cyan-600 flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white ml-0.5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
