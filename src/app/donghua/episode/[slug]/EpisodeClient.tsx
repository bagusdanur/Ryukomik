"use client";
import { useState, useRef } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";

type DonghuaPlayer = {
  label?: string;
  iframe?: string;
};

type DonghuaNavigation = {
  prev?: string;
  next?: string;
  allEpisode?: string;
};

type DonghuaDownloadLink = {
  label?: string;
  url?: string;
};

type DonghuaDownloadGroup = {
  quality?: string;
  links?: DonghuaDownloadLink[];
};

type DonghuaEpisode = {
  episodeTitle?: string;
  title?: string;
  releasedOn?: string;
  subDub?: string;
  type?: string;
  players?: DonghuaPlayer[];
  navigation?: DonghuaNavigation;
  downloads?: DonghuaDownloadGroup[];
  thumbnail?: string;
};

type DonghuaEpisodeClientProps = {
  data: DonghuaEpisode | null;
};

export default function DonghuaEpisodeClient({ data }: DonghuaEpisodeClientProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Field anichin: episodeTitle, bukan title
  const cleanTitle = (data?.episodeTitle || data?.title || "").replace(" Subtitle Indonesia", "");

  // Field anichin: players[].label & players[].iframe
  const activePlayers = (data?.players || []).filter((p) => p.iframe);
  const defaultPlayer = activePlayers.findIndex((p) =>
    p.label?.toLowerCase().includes("premium")
  );
  const [activePlayer, setActivePlayer] = useState(
    defaultPlayer !== -1 ? defaultPlayer : 0
  );

  if (!data) return <div>Error</div>;

  // Field anichin: navigation.prev / navigation.next / navigation.allEpisode
  const nav = data?.navigation || {};
  const prevLinkStyle = { "--hover-border": "rgba(255,159,28,0.25)" } as CSSProperties;

  return (
    <div className="rk-page text-white pb-28" style={{ fontFamily: "'Syne', sans-serif" }}>

      {/* ── PLAYER ── */}
      <div className="w-full bg-[#0a0a0a] relative">
        {activePlayers[activePlayer]?.iframe ? (
          <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
            <iframe
              ref={iframeRef}
              key={activePlayers[activePlayer].iframe}
              src={activePlayers[activePlayer].iframe}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              allow="autoplay; fullscreen"
              referrerPolicy="no-referrer"
              frameBorder="0"
            />
          </div>
        ) : (
          <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,159,28,0.1)", border: "1px solid rgba(255,159,28,0.25)" }}>
                <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#ff9f1c" }}>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-[9px] font-black text-white/20 tracking-[.18em] uppercase">Pilih server di bawah</p>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4">

        {/* ── TITLE ── */}
        <div className="mt-5 mb-5">
          <h1 className="text-[13px] font-black text-white uppercase tracking-tight leading-snug">{cleanTitle}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-bold text-white/25">{data.releasedOn}</span>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <span
              className="text-[9px] font-black rounded-md px-1.5 py-0.5 uppercase tracking-wider"
              style={{ color: "#ff9f1c", background: "rgba(255,159,28,0.1)", border: "1px solid rgba(255,159,28,0.2)" }}
            >
              {data.subDub || "Sub Indo"}
            </span>
            {data.type && (
              <>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-wider">{data.type}</span>
              </>
            )}
          </div>
        </div>

        {/* ── NAV ── */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {nav.prev ? (
            <Link prefetch={false} href={`/donghua/episode/${nav.prev}`}
              className="rk-btn-ghost flex items-center justify-center gap-1.5 py-3 rounded-2xl active:scale-95"
              style={prevLinkStyle}
            >
              <svg className="w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Prev</span>
            </Link>
          ) : (
            <div className="flex items-center justify-center py-3 bg-[#1a1a1b]/40 border border-white/5 rounded-2xl opacity-20 cursor-not-allowed">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Prev</span>
            </div>
          )}

          {nav.allEpisode ? (
            <Link prefetch={false} href={`/donghua/detail/${nav.allEpisode}`}
              className="flex items-center justify-center gap-1.5 py-3 rounded-2xl border active:scale-95"
              style={{ background: "rgba(255,159,28,0.08)", borderColor: "rgba(255,159,28,0.25)" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: "#ff9f1c" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#ff9f1c" }}>Semua</span>
            </Link>
          ) : (
            <div className="flex items-center justify-center py-3 bg-[#1a1a1b]/40 border border-white/5 rounded-2xl opacity-20 cursor-not-allowed">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Semua</span>
            </div>
          )}

          {nav.next ? (
            <Link prefetch={false} href={`/donghua/episode/${nav.next}`}
              className="rk-btn-primary flex items-center justify-center gap-1.5 py-3 rounded-2xl active:scale-95"
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-black">Next</span>
              <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <div className="flex items-center justify-center py-3 bg-[#1a1a1b]/40 border border-white/5 rounded-2xl opacity-20 cursor-not-allowed">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Next</span>
            </div>
          )}
        </div>

        {/* ── DIVIDER ── */}
        <div className="h-px bg-white/[0.04] mb-5" />

        {/* ── SERVER ── */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#ff9f1c" }} />
          <span className="text-[9px] font-black uppercase tracking-[.18em]" style={{ color: "#ff9f1c" }}>Pilih Server</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {activePlayers.map((player, idx) => (
            <button key={idx} onClick={() => setActivePlayer(idx)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left active:scale-95"
              style={
                activePlayer === idx
                  ? { background: "rgba(255,159,28,0.12)", borderColor: "rgba(255,159,28,0.5)" }
                  : { background: "#1a1a1b", borderColor: "rgba(255,255,255,0.05)" }
              }
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0 border"
                style={
                  activePlayer === idx
                    ? { background: "#ff9f1c", borderColor: "#ff9f1c" }
                    : { background: "transparent", borderColor: "rgba(255,255,255,0.15)" }
                }
              />
              <span
                className="text-[11px] font-black uppercase tracking-tight truncate"
                style={{ color: activePlayer === idx ? "#ff9f1c" : "rgba(255,255,255,0.35)" }}
              >
                {player.label}
              </span>
            </button>
          ))}
        </div>

        {/* ── DOWNLOAD ── */}
        {data.downloads?.length > 0 && (
          <>
            <div className="h-px bg-white/[0.04] mb-5" />
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#ff9f1c" }} />
              <span className="text-[9px] font-black uppercase tracking-[.18em]" style={{ color: "#ff9f1c" }}>Download</span>
            </div>
            <div className="flex flex-col gap-3 mb-5">
              {data.downloads.map((dl, idx) => (
                <div key={idx}>
                  {/* quality label */}
                  <span className="text-[9px] font-black text-white/25 uppercase tracking-widest mb-1.5 block">
                    {dl.quality}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(dl.links ?? []).map((link, j) => (
                      <a key={j} href={link.url ?? "#"} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/5 active:scale-95 group"
                        style={{ background: "#1a1a1b" }}
                      >
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: "#ff9f1c" }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="text-[11px] font-black uppercase tracking-tight text-white/35 group-hover:text-white truncate">
                          {link.label ?? "Download"}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── THUMBNAIL ── */}
        <div className="h-px bg-white/[0.04] mb-5" />
        <div className="relative rounded-2xl overflow-hidden border border-white/[0.05]" style={{ aspectRatio: "16/9" }}>
          {data.thumbnail && (
            <img referrerPolicy="no-referrer" src={data.thumbnail} alt={cleanTitle}
              className="absolute inset-0 w-full h-full object-cover opacity-25" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-4 text-center">
            <span className="text-[9px] font-black uppercase tracking-[.18em] text-white/25">Thumbnail</span>
            <span className="text-[12px] font-black uppercase tracking-tight text-white leading-snug">{cleanTitle}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
