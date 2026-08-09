"use client";
import Link from "next/link";
import { useState, useMemo } from "react";
import { nekoImg } from "@/utils/neko";
import Button from "@/components/Button";

type HentaiGenre = {
  name?: string;
  slug?: string;
};

type HentaiEpisode = {
  title?: string;
  label?: string;
  slug?: string;
  date?: string;
};

type NumberedHentaiEpisode = HentaiEpisode & {
  num: number;
};

type HentaiDetail = {
  title?: string;
  thumbnail?: string;
  status?: string;
  score?: string | number;
  type?: string;
  totalEpisodes?: string | number;
  duration?: string;
  aired?: string;
  genres?: HentaiGenre[];
  firstEpisode?: HentaiEpisode;
  lastEpisode?: HentaiEpisode;
  synopsis?: string;
  episodeList?: HentaiEpisode[];
};

type HentaiDetailClientProps = {
  data: HentaiDetail | null;
  slug: string;
};

export default function HentaiDetailClient({ data, slug }: HentaiDetailClientProps) {
  const [synopsisOpen, setSynopsisOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);

  const filteredEpisodes = useMemo(() => {
    let list: NumberedHentaiEpisode[] =
      data?.episodeList?.map((ep, idx) => ({
        ...ep,
        num: idx + 1,
      })) ?? [];

    const keyword = search.trim().toLowerCase();
    if (search)
      list = list.filter(
        (ep) => {
          const episodeText = `${ep.title ?? ""} ${ep.label ?? ""}`.toLowerCase();
          return episodeText.includes(keyword) || String(ep.num).includes(keyword);
        }
      );

    if (!sortAsc) list = [...list].reverse();

    return list;
  }, [data?.episodeList, search, sortAsc]);

  if (!data)
    return (
      <div className="rk-page flex flex-col items-center justify-center gap-3 text-white">
        <div className="text-4xl">😵</div>
        <p className="font-black uppercase tracking-widest text-sm">
          Tidak ditemukan
        </p>
        <Link
          prefetch={false}
          href="/hentai/terbaru"
          className="text-xs text-[#ff5078] underline underline-offset-4"
        >
          Kembali
        </Link>
      </div>
    );

  const cleanTitle = (data.title ?? slug)
    .replace(/^\[.*?\]\s*/, "")
    .replace(" Subtitle Indonesia", "")
    .trim();

  return (
    <div
      className="rk-page text-white pb-28 relative"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <div className="relative z-10 max-w-lg mx-auto">

        {/* ── BACK NAV ── */}
        <div className="px-5 pt-7 mb-5">
          <Link
            prefetch={false}
            href="/hentai/terbaru"
            className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[.15em] uppercase text-white/30 transition-colors duration-200 hover:text-[#ff8fa3]"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Kembali
          </Link>
        </div>

        {/* ── HERO ── */}
        <div className="px-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff5078]" />
            <span className="text-[10px] font-semibold tracking-[.18em] uppercase text-[#ffb3c6]">
              {data.status}
            </span>
          </div>

          <div className="flex gap-4">
            {/* Poster */}
            <div className="relative shrink-0 group">
              <div className="w-[110px] aspect-[2/3] rounded-2xl overflow-hidden border border-white/5">
                <img
                  src={nekoImg(data.thumbnail)}
                  alt={cleanTitle}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Score badge */}
              {data.score && (
                <div className="absolute -bottom-2.5 -right-2.5 flex items-center gap-1 bg-[#ff5078] text-white text-[10px] font-black px-2 py-1 rounded-xl border border-white/10">
                  <svg className="w-2.5 h-2.5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {data.score}
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="flex-1 pt-1">
              <h1
                className="text-[20px] font-black leading-tight tracking-tight mb-2"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {cleanTitle}
              </h1>

              <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
                {data.type && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-white/20 uppercase tracking-widest">Type</span>
                    <span className="text-[10px] font-bold text-white/70">{data.type}</span>
                  </div>
                )}
                {data.totalEpisodes && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-white/20 uppercase tracking-widest">Ep</span>
                    <span className="text-[10px] font-bold text-white/70">{data.totalEpisodes}</span>
                  </div>
                )}
                {data.duration && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-white/20 uppercase tracking-widest">Dur</span>
                    <span className="text-[10px] font-bold text-white/70">{data.duration}</span>
                  </div>
                )}
                {data.aired && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-white/20 uppercase tracking-widest">Aired</span>
                    <span className="text-[10px] font-bold text-white/70">{data.aired}</span>
                  </div>
                )}
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-1">
                {data.genres?.map((g, idx) => (
                  <span
                    key={g.slug ?? `${g.name}-${idx}`}
                    className="text-[8px] font-bold px-2 py-0.5 rounded-full border border-[#ff5078]/20 bg-[#ff5078]/8 text-[#ffb3c6]/60 uppercase tracking-wider"
                  >
                    {g.name}
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
              href={`/hentai/episode/${data.lastEpisode?.slug ?? ""}`}
            className="rk-btn-ghost group flex items-center justify-center gap-2 rounded-2xl py-3.5 active:scale-95"
          >
            <div className="w-2 h-2 bg-white/20 rounded-full transition-colors duration-200 group-hover:bg-white/50" />
            <span className="text-[11px] font-black uppercase tracking-wider" style={{ fontFamily: "'Syne', sans-serif" }}>
              Episode 1
            </span>
          </Link>
          <Link
            prefetch={false}
              href={`/hentai/episode/${data.firstEpisode?.slug ?? ""}`}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white active:scale-95"
            style={{ background: "#ff5078" }}
          >
            <span className="text-[11px] font-black uppercase tracking-wider" style={{ fontFamily: "'Syne', sans-serif" }}>
              Terbaru
            </span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        {/* ── SYNOPSIS ── */}
        {data.synopsis && (
          <div className="px-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff5078]" />
              <span className="text-[10px] font-semibold tracking-[.18em] uppercase text-[#ffb3c6]">
                Sinopsis
              </span>
            </div>
            <div className={`relative overflow-hidden ${synopsisOpen ? "" : "max-h-[72px]"}`}>
              <p className="text-xs text-white/40 font-light leading-relaxed">{data.synopsis}</p>
              {!synopsisOpen && (
                <div className="absolute bottom-0 left-0 right-0 h-8" style={{ background: "rgba(40,40,40,0.86)" }} />
              )}
            </div>
            <button
              onClick={() => setSynopsisOpen((v) => !v)}
              className="text-[10px] font-bold text-[#ff5078] mt-2 uppercase tracking-widest transition-colors duration-200 hover:text-[#ffb3c6]"
            >
              {synopsisOpen ? "Tutup ↑" : "Selengkapnya ↓"}
            </button>
          </div>
        )}

        <div className="mx-5 h-px bg-white/5 mb-6" />

        {/* ── EPISODE LIST ── */}
        <div className="px-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-black tracking-widest" style={{ fontFamily: "'Syne', sans-serif" }}>
              LIST EPISODE
            </span>
            <span className="text-xs text-white/25">{data.episodeList?.length} eps</span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Cari episode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rk-input w-full rounded-xl pl-8 pr-3 py-2 text-[11px] font-bold placeholder-white/20"
                style={{ fontFamily: "'Syne', sans-serif" }}
              />
            </div>
            <Button
              variant="ghost"
              onClick={() => setSortAsc((p) => !p)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black whitespace-nowrap"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {sortAsc ? "TERLAMA" : "TERBARU"}
              <svg className={`w-3 h-3 ${sortAsc ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </Button>
          </div>

          {/* List */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-80 pr-1 scrollbar-thin scrollbar-thumb-[#ff5078]/30 scrollbar-track-transparent">
            {filteredEpisodes.length === 0 ? (
              <p className="text-center py-6 text-[11px] font-black text-white/20 tracking-widest uppercase" style={{ fontFamily: "'Syne', sans-serif" }}>
                Tidak ditemukan
              </p>
            ) : (
              filteredEpisodes.map((ep) => (
                <Link
                  prefetch={false}
                  key={ep.slug ?? `${ep.label}-${ep.num}`}
                  href={`/hentai/episode/${ep.slug ?? ""}`}
                  className="rk-card-soft group flex items-center gap-3 rounded-2xl p-3 transition-colors duration-200 hover:border-cyan-200/20"
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 transition-colors duration-200 group-hover:bg-[#ff5078] shrink-0">
                    <span className="text-[11px] font-black text-white/60 transition-colors duration-200 group-hover:text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
                      {ep.num}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-white/80 group-hover:text-white truncate uppercase tracking-tight transition-colors duration-200" style={{ fontFamily: "'Syne', sans-serif" }}>
                      {ep.label}
                    </p>
                    <p className="text-[9px] text-white/25 font-medium mt-0.5">{ep.date}</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity duration-200">
                    <div className="w-7 h-7 rounded-full bg-[#ff5078] flex items-center justify-center">
                      <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
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
