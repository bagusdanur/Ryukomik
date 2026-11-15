"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { nekoImg } from "@/utils/neko";
import HentaiPlayer from "@/components/hentai/HentaiPlayer";

type HentaiPlayerType = {
  label?: string;
  src?: string;
};

type HentaiDownloadLink = {
  label?: string;
  href?: string;
};

type HentaiDownloadGroup = {
  quality?: string;
  links?: HentaiDownloadLink[];
};

type HentaiEpisode = {
  title?: string;
  duration?: string;
  size?: string;
  genres?: string[];
  prev?: string;
  next?: string;
  allEpisode?: string;
  players?: HentaiPlayerType[];
  downloads?: HentaiDownloadGroup[];
  thumbnail?: string;
};

type HentaiEpisodeClientProps = {
  data: HentaiEpisode | null;
};

export default function HentaiEpisodeClient({ data }: HentaiEpisodeClientProps) {
  const cleanTitle = (data?.title || "")
    .replace(/^\[.*?\]\s*/, "")
    .replace(" Subtitle Indonesia", "")
    .trim();

  const activePlayers = (data?.players || []).filter((p) => p.src);
  
  // Prioritaskan streampoi.com sebagai player utama jika ada
  const initialPlayerIndex = Math.max(0, activePlayers.findIndex(p => p.src?.includes('streampoi.com')));
  const [activePlayer, setActivePlayer] = useState(initialPlayerIndex);
  const [openQuality, setOpenQuality] = useState<number | null>(null);

  if (!data) return <div>Error</div>;

  const titleBadgeMatch = data.title?.match(/^\[([^\]]+)\]/);

  return (
    <div
      className="rk-page text-white pb-28"
      style={{ fontFamily: "'Syne', sans-serif" }}
    >

      {/* ── PLAYER ── */}
      <div className="w-full bg-[#0a0a0a] relative">
        <HentaiPlayer src={activePlayers[activePlayer]?.src} />
      </div>

      <div className="max-w-2xl mx-auto px-4">

        {/* ── TITLE ── */}
        <div className="mt-5 mb-4">
          {/* tag badge */}
          {titleBadgeMatch && (
            <span
              className="inline-block text-[7px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md mb-2"
              style={{ background: "#ff5078", color: "#fff" }}
            >
              {titleBadgeMatch[1] === "NEW Release"
                ? "NEW"
                : titleBadgeMatch[1]}
            </span>
          )}
          <h1 className="text-[13px] font-black text-white uppercase tracking-tight leading-snug">
            {cleanTitle}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {data.duration && (
              <span className="text-[9px] font-bold text-white/25">{data.duration}</span>
            )}
            {data.duration && data.size && (
              <div className="w-1 h-1 rounded-full bg-white/10" />
            )}
            <span className="text-[9px] font-black text-[#ff5078] bg-[#ff5078]/10 border border-[#ff5078]/20 rounded-md px-1.5 py-0.5 uppercase tracking-wider">
              Sub Indo
            </span>
          </div>
        </div>

        {/* ── GENRES ── */}
        {data.genres?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {data.genres.map((g, i) => (
              <span
                key={i}
                className="text-[8px] font-bold text-white/30 bg-white/5 border border-white/8 rounded-lg px-2 py-1 tracking-wide"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* ── NAV ── */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {data.prev ? (
            <Link
              prefetch={false}
              href={`/hentai/episode/${data.prev}`}
              className="rk-btn-ghost flex items-center justify-center gap-1.5 py-3 rounded-2xl active:scale-95"
            >
              <svg className="w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Prev</span>
            </Link>
          ) : (
            <div className="flex items-center justify-center py-3 bg-[var(--surface-1)]/40 border border-white/5 rounded-2xl opacity-20 cursor-not-allowed">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Prev</span>
            </div>
          )}

          <Link
            prefetch={false}
            href={`/hentai/detail/${data.allEpisode}`}
            className="flex items-center justify-center gap-1.5 py-3 bg-[#ff5078]/8 hover:bg-[#ff5078]/15 border border-[#ff5078]/25 rounded-2xl active:scale-95 transition-colors duration-200"
          >
            <svg className="w-3.5 h-3.5 text-[#ff8fa3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#ff8fa3]">Semua</span>
          </Link>

          {data.next ? (
            <Link
              prefetch={false}
              href={`/hentai/episode/${data.next}`}
              className="rk-btn-primary flex items-center justify-center gap-1.5 py-3 rounded-2xl active:scale-95"
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-white">Next</span>
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <div className="flex items-center justify-center py-3 bg-[var(--surface-1)]/40 border border-white/5 rounded-2xl opacity-20 cursor-not-allowed">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Next</span>
            </div>
          )}
        </div>

        <div className="h-px bg-white/[0.04] mb-5" />

        {/* ── SERVER ── */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#ff5078]" />
          <span className="text-[9px] font-black text-[#ff5078] uppercase tracking-[.18em]">
            Pilih Server
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {activePlayers.map((player, idx) => (
            <button
              key={idx}
              onClick={() => setActivePlayer(idx)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left active:scale-95 transition-colors duration-200 ${
                activePlayer === idx
                  ? "bg-[#ff5078]/12 border-[#ff5078]/50"
                  : "bg-white/[0.04] border-white/5 hover:border-cyan-200/25 hover:bg-cyan-400/5"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 border ${
                  activePlayer === idx
                    ? "bg-[#ff5078] border-[#ff5078]"
                    : "bg-transparent border-white/15"
                }`}
              />
              <span
                className={`text-[11px] font-black uppercase tracking-tight truncate ${
                  activePlayer === idx ? "text-[#ffb3c6]" : "text-white/35"
                }`}
              >
                {player.label}
              </span>
              {player.label?.toUpperCase() === "RYU-LOKAL" && (
                <span className="ml-auto text-[8px] font-black tracking-wider text-[#ffb3c6] bg-[#ff5078]/15 border border-[#ff5078]/30 rounded-md px-1.5 py-0.5 uppercase flex-shrink-0">⚡ HD</span>
              )}
            </button>
          ))}
        </div>

        {/* ── DOWNLOAD ── */}
        {data.downloads?.length > 0 && (
          <>
            <div className="h-px bg-white/[0.04] mb-5" />
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff5078]" />
              <span className="text-[9px] font-black text-[#ff5078] uppercase tracking-[.18em]">
                Download
              </span>
            </div>

            {/* size info */}
            {data.size && (
              <p className="text-[9px] text-white/20 font-bold mb-3 leading-relaxed">
                {data.size}
              </p>
            )}

            <div className="flex flex-col gap-3 mb-5">
              {data.downloads.map((dl, idx) => (
                <div key={idx}>
                  {/* quality header */}
                  <button
                    onClick={() => setOpenQuality(openQuality === idx ? null : idx)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-[var(--surface-1)] border border-white/5 hover:border-[#ff5078]/25 rounded-xl active:scale-95 transition-colors duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-[#ff5078] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span className="text-[11px] font-black uppercase tracking-tight text-white/60">
                        {dl.quality ?? "Download"}
                      </span>
                    </div>
                    <svg
                      className={`w-3.5 h-3.5 text-white/25 ${openQuality === idx ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* links */}
                  {openQuality === idx && (
                    <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                      {(dl.links ?? []).map((link, lidx) => (
                        <a
                          key={lidx}
                          href={link.href ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-[#ff5078]/5 hover:bg-[#ff5078]/10 border border-[#ff5078]/15 hover:border-[#ff5078]/30 rounded-xl active:scale-95 group transition-colors duration-200"
                        >
                          <svg className="w-3 h-3 text-[#ff5078] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span className="text-[10px] font-black uppercase tracking-tight text-white/40 group-hover:text-white/70 truncate transition-colors duration-200">
                            {link.label}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── THUMBNAIL ── */}
        <div className="h-px bg-white/[0.04] mb-5" />
        <div
          className="relative rounded-2xl overflow-hidden border border-white/[0.05]"
          style={{ aspectRatio: "16/9" }}
        >
          {data.thumbnail && (
            <img
              src={nekoImg(data.thumbnail)}
              alt={cleanTitle}
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-4 text-center">
            <span className="text-[9px] font-black uppercase tracking-[.18em] text-white/25">
              Thumbnail
            </span>
            <span className="text-[12px] font-black uppercase tracking-tight text-white leading-snug">
              {cleanTitle}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
