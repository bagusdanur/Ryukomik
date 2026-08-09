"use client";
import Link from "next/link";
import { useState, useMemo } from "react";

type DonghuaInfo = {
  status?: string;
  studio?: string;
  type?: string;
  totalEpisodes?: string | number;
  released?: string;
  duration?: string;
  network?: string;
  country?: string;
};

type DonghuaGenre = {
  name?: string;
  slug?: string;
};

type DonghuaEpisode = {
  title?: string;
  slug?: string;
  num?: string | number;
  sub?: string;
  date?: string;
};

type NumberedDonghuaEpisode = DonghuaEpisode & {
  displayNum: number;
};

type DonghuaDetail = {
  title?: string;
  thumbnail?: string;
  rating?: string | number;
  info?: DonghuaInfo;
  totalEpisodesFound?: string | number;
  episodeList?: DonghuaEpisode[];
  episodeListAsc?: DonghuaEpisode[];
  latestEpisode?: DonghuaEpisode;
  genres?: DonghuaGenre[];
  synopsis?: string;
  alternativeTitle?: string;
};

type DetailClientProps = {
  data: DonghuaDetail | null;
  slug: string;
};

export default function DetailClient({ data, slug }: DetailClientProps) {
  const [synopsisOpen, setSynopsisOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);

  const filteredEpisodes = useMemo(() => {
    if (!data?.episodeList) return [];

    let list: NumberedDonghuaEpisode[] = data.episodeList.map((ep, idx) => ({
      ...ep,
      displayNum: data.episodeList.length - idx,
    }));

    const keyword = search.trim().toLowerCase();
    if (search)
      list = list.filter(
        (ep) =>
          (ep.title ?? "").toLowerCase().includes(keyword) ||
          String(ep.displayNum).includes(keyword),
      );

    if (sortAsc) list = [...list].reverse();

    return list;
  }, [data, search, sortAsc]);

  if (!data)
    return (
      <div className="rk-page flex flex-col items-center justify-center gap-3 text-white">
        <div className="text-4xl">😵</div>
        <p className="font-black uppercase tracking-widest text-sm">
          Donghua tidak ditemukan
        </p>
        <Link
          prefetch={false}
          href="/donghua/terbaru"
          className="text-xs underline underline-offset-4"
          style={{ color: "#ff9f1c" }}
        >
          Kembali
        </Link>
      </div>
    );

  const cleanTitle = (data.title ?? slug)
    ?.replace("Nonton ", "")
    .replace(" Sub Indo", "");

  // Field mapping dari API anichin
  const status = data.info?.status;
  const studio = data.info?.studio;
  const type = data.info?.type;
  const totalEpisodes = data.info?.totalEpisodes;
  const foundEpisodes = data.totalEpisodesFound;
  const firstEpisodeSlug = data.episodeListAsc?.[0]?.slug;
  const latestEpisodeSlug = data.latestEpisode?.slug;

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
            href="/donghua/terbaru"
            className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[.15em] uppercase text-white/30 transition-colors duration-200 hover:text-[#ffbf5e]"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Kembali
          </Link>
        </div>

        {/* ── HERO SECTION ── */}
        <div className="px-5 mb-6">
          {/* Status label */}
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "#ff9f1c",
              }}
            />
            <span
              className="text-[10px] font-semibold tracking-[.18em] uppercase"
              style={{ color: "#ffbf5e" }}
            >
              {status}
            </span>
          </div>

          {/* Poster + Meta */}
          <div className="flex gap-4">
            {/* Poster */}
            <div className="relative shrink-0 group">
              <div className="w-[110px] aspect-[2/3] rounded-2xl overflow-hidden border border-white/5">
                <img
                  src={data.thumbnail}
                  alt={cleanTitle}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Rating badge */}
              <div
                className="absolute -bottom-2.5 -right-2.5 flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-xl border border-white/10"
                style={{
                  background: "#ff9f1c",
                  color: "#1a0900",
                }}
              >
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {data.rating}
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
                {type && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-white/20 uppercase tracking-widest">Type</span>
                    <span className="text-[10px] font-bold text-white/70">{type}</span>
                  </div>
                )}
                {(foundEpisodes || totalEpisodes) && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-white/20 uppercase tracking-widest">Ep</span>
                    <span className="text-[10px] font-bold text-white/70">
                      {foundEpisodes ?? "?"}/{totalEpisodes ?? "?"}
                    </span>
                  </div>
                )}
                {studio && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-white/20 uppercase tracking-widest">Studio</span>
                    <span className="text-[10px] font-bold" style={{ color: "#ffbf5e" }}>
                      {studio}
                    </span>
                  </div>
                )}
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-1">
                {data.genres?.map((genre, idx) => (
                  <span
                    key={genre.slug ?? `${genre.name}-${idx}`}
                    className="text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                    style={{
                      border: "1px solid rgba(255,159,28,0.15)",
                      background: "rgba(255,159,28,0.06)",
                      color: "rgba(255,255,255,0.4)",
                    }}
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
            href={`/donghua/episode/${firstEpisodeSlug}`}
            className="rk-btn-ghost group flex items-center justify-center gap-2 rounded-2xl py-3.5 active:scale-95"
          >
            <div className="w-2 h-2 bg-white/20 rounded-full transition-colors duration-200 group-hover:bg-white/50" />
            <span
              className="text-[11px] font-black uppercase tracking-wider"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Episode 1
            </span>
          </Link>
          <Link
            prefetch={false}
            href={`/donghua/episode/${latestEpisodeSlug}`}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl active:scale-95"
            style={{
              background: "#ff9f1c",
              color: "#1a0900",
            }}
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        {/* ── SYNOPSIS ── */}
        <div className="px-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#ff9f1c" }} />
            <span
              className="text-[10px] font-semibold tracking-[.18em] uppercase"
              style={{ color: "#ffbf5e" }}
            >
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
            className="text-[10px] font-bold mt-2 uppercase tracking-widest transition-opacity duration-200 hover:opacity-70"
            style={{ color: "#ff9f1c" }}
          >
            {synopsisOpen ? "Tutup ↑" : "Selengkapnya ↓"}
          </button>
        </div>

        {/* ── INFO GRID ── */}
        <div className="px-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#ff9f1c" }} />
            <span
              className="text-[10px] font-semibold tracking-[.18em] uppercase"
              style={{ color: "#ffbf5e" }}
            >
              Info
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Rilis", value: data.info?.released },
              { label: "Durasi", value: data.info?.duration },
              { label: "Network", value: data.info?.network },
              { label: "Negara", value: data.info?.country },
            ]
              .filter((x) => x.value)
              .map(({ label, value }) => (
                <div
                  key={label}
                  className="rk-card-soft rounded-xl px-3 py-2"
                >
                  <p className="text-[9px] text-white/20 uppercase tracking-widest mb-0.5">
                    {label}
                  </p>
                  <p className="text-[11px] font-bold text-white/70">{value}</p>
                </div>
              ))}
            {data.alternativeTitle && (
              <div className="rk-card-soft col-span-2 rounded-xl px-3 py-2">
                <p className="text-[9px] text-white/20 uppercase tracking-widest mb-0.5">
                  Judul Alternatif
                </p>
                <p className="text-[11px] font-bold text-white/70">{data.alternativeTitle}</p>
              </div>
            )}
          </div>
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
              {data.episodeList?.length ?? 0} eps
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
                className="rk-input w-full rounded-xl pl-8 pr-3 py-2 text-[11px] font-bold placeholder-white/20"
                style={{ fontFamily: "'Syne', sans-serif" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(255,159,28,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.05)")}
              />
            </div>
            <button
              onClick={() => setSortAsc((p) => !p)}
              className="rk-btn-ghost flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black whitespace-nowrap"
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
          <div
            className="flex flex-col gap-2 overflow-y-auto max-h-80 pr-1"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,159,28,0.3) transparent" }}
          >
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
                  key={ep.slug ?? `${ep.num}-${ep.displayNum}`}
                  href={`/donghua/episode/${ep.slug ?? ""}`}
                  className="rk-card-soft group flex items-center gap-3 rounded-2xl p-3"
                >
                  {/* Number box */}
                  <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 transition-colors duration-200 group-hover:bg-[#ff9f1c] shrink-0">
                    <span
                      className="text-[11px] font-black text-white/60 transition-colors duration-200 group-hover:text-[#1a0900]"
                      style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                      {ep.displayNum}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[11px] font-black text-white/80 group-hover:text-white truncate uppercase tracking-tight transition-colors duration-200"
                      style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                      Episode {ep.num}
                      {ep.sub && (
                        <span
                          className="ml-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{
                            background: "rgba(255,159,28,0.15)",
                            color: "#ff9f1c",
                          }}
                        >
                          {ep.sub}
                        </span>
                      )}
                    </p>
                    <p className="text-[9px] text-white/25 font-medium mt-0.5">{ep.date}</p>
                  </div>

                  {/* Play button */}
                  <div className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity duration-200">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{
                        background: "#ff9f1c",
                      }}
                    >
                      <svg className="w-3 h-3 ml-0.5" fill="#1a0900" viewBox="0 0 24 24">
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
