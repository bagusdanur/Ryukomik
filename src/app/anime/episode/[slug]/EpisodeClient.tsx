"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import AnimePlayer from "@/components/anime/AnimePlayer";
import AnimeComments from "@/components/anime/AnimeComments";
import NobarButton from "@/components/anime/NobarButton";

type AnimePlayerType = {
  name?: string;
  iframe?: string;
  streamUrl?: string;
};

type AnimeDownload = {
  name?: string;
  url?: string;
};

type AnimeEpisode = {
  title?: string;
  date?: {
    formatted?: string;
    raw?: string;
  };
  prev?: string;
  next?: string;
  allEpisode?: string;
  players?: AnimePlayerType[];
  downloads?: AnimeDownload[];
  thumbnail?: string;
};

type EpisodeClientProps = {
  data: AnimeEpisode | null;
  slug: string;
};

/** Server tanpa iklan ("ryu-lokal"): filedon & mega di-resolve jadi <video>
 *  lokal; Blogger bersih dari sananya jadi iframe-nya dipakai langsung. */
function isCleanPlayer(player: AnimePlayerType) {
  return /filedon\.co|mega\.nz|blogger\.com/i.test(player.iframe ?? "") || Boolean(player.streamUrl);
}

export default function EpisodeClient({ data, slug }: EpisodeClientProps) {
  const cleanTitle = data?.title?.replace(" Sub Indo", "") || "";
  // Server "Ryu-lokal" (filedon/mega/blogger = tanpa iklan) selalu diurutkan
  // paling atas dan namanya diseragamkan: "Ryu-lokal 360p", "Ryu-lokal 480p", ...
  const activePlayers = useMemo(() => {
    const list = data?.players?.filter((p) => p.iframe) || [];
    return list
      .map((p, order) => ({ p, order, clean: isCleanPlayer(p) }))
      .sort((a, b) => Number(b.clean) - Number(a.clean) || a.order - b.order)
      .map(({ p, clean }) => {
        // Kualitas dipisah jadi field sendiri supaya tidak ikut terpotong
        // truncate di layar sempit (mobile) — selalu tampil sebagai badge.
        const quality = (p.name || "").match(/(\d{3,4}\s*p)/i)?.[1]?.replace(/\s+/g, "").toUpperCase() || "";
        const label = clean
          ? "Ryu-lokal"
          : (p.name || "Server").replace("S-", "").replace(/\d{3,4}\s*p/i, "").trim() || "Server";
        return { p, clean, quality, label };
      });
  }, [data]);
  const [activePlayer, setActivePlayer] = useState(0);

  if (!data) return <div>Error</div>;

  return (
    <div className="rk-page text-white pb-28" style={{ fontFamily: "'Syne', sans-serif" }}>
        
      {/* ── PLAYER ── */}
      {/* AnimePlayer = "ryu-lokal": server yang didukung resolver (filedon) akan
          diputar memakai <video> sendiri sehingga iklan hilang; server lain
          otomatis fallback ke <iframe>. */}
      <div className="w-full bg-[#0a0a0a] relative">
        <AnimePlayer
          key={activePlayers[activePlayer]?.p.iframe || "none"}
          src={activePlayers[activePlayer]?.p.iframe}
        />
      </div>

      <div className="max-w-2xl mx-auto px-4">

        {/* ── TITLE ── */}
        <div className="mt-5 mb-5">
          <h1 className="text-[13px] font-black text-white uppercase tracking-tight leading-snug">{cleanTitle}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-bold text-white/25">
              {data.date?.formatted || data.date?.raw || ""}
            </span>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <span className="text-[9px] font-black text-cyan-200 bg-cyan-400/10 border border-cyan-300/20 rounded-md px-1.5 py-0.5 uppercase tracking-wider">Sub Indo</span>
          </div>
        </div>

        {/* ── NAV ── */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {data.prev ? (
            <Link prefetch={false} href={`/anime/episode/${data.prev}`}
              className="rk-btn-ghost flex items-center justify-center gap-1.5 rounded-2xl py-3 active:scale-95">
              <svg className="w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Prev</span>
            </Link>
          ) : (
            <div className="flex items-center justify-center py-3 bg-[var(--surface-1)]/40 border border-white/5 rounded-2xl opacity-20 cursor-not-allowed">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Prev</span>
            </div>
          )}

          <Link prefetch={false} href={`/anime/detail/${data.allEpisode}`}
            className="flex items-center justify-center gap-1.5 py-3 bg-cyan-400/10 hover:bg-cyan-400/15 border border-cyan-300/25 rounded-2xl active:scale-95 transition-colors duration-200">
            <svg className="w-3.5 h-3.5 text-cyan-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-200">Semua</span>
          </Link>

          {data.next ? (
            <Link  prefetch={false} href={`/anime/episode/${data.next}`}
              className="rk-btn-primary flex items-center justify-center gap-1.5 py-3 rounded-2xl active:scale-95">
              <span className="text-[10px] font-black uppercase tracking-wider text-white">Next</span>
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </Link>
          ) : (
            <div className="flex items-center justify-center py-3 bg-[var(--surface-1)]/40 border border-white/5 rounded-2xl opacity-20 cursor-not-allowed">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Next</span>
            </div>
          )}
        </div>

        {/* ── NOBAR (tepat di bawah navigasi, biar kelihatan) ── */}
        <div className="mb-5">
          <NobarButton
            slug={slug}
            title={cleanTitle}
            animeSlug={data.allEpisode}
            playerLabel={activePlayers[activePlayer]?.p.name}
            playerUrl={activePlayers[activePlayer]?.p.iframe}
          />
        </div>

        {/* ── DIVIDER ── */}
        <div className="h-px bg-white/[0.04] mb-5" />

        {/* ── SERVER ── */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
          <span className="text-[9px] font-black text-cyan-200 uppercase tracking-[.18em]">Pilih Server</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {activePlayers.map((item, idx) => {
            const isClean = item.clean;
            return (
              <button key={idx} onClick={() => setActivePlayer(idx)}
                className={`flex items-center gap-2 px-2.5 py-2.5 rounded-xl border text-left active:scale-95 transition-colors duration-200 ${
                  activePlayer === idx
                    ? "bg-cyan-400/10 border-cyan-300/50"
                    : "bg-white/[0.04] border-white/5 hover:border-cyan-300/25 hover:bg-cyan-400/5"
                }`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 border ${
                  activePlayer === idx ? "bg-cyan-300 border-cyan-300" : "bg-transparent border-white/15"
                }`} />
                <span className={`min-w-0 flex-1 text-[11px] font-black uppercase tracking-tight truncate ${
                  activePlayer === idx ? "text-cyan-100" : "text-white/35"
                }`}>
                  {item.label}
                </span>
                {item.quality && (
                  <span
                    className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-black tracking-wider ${
                      isClean
                        ? "text-cyan-300 bg-cyan-400/15 border-cyan-300/30"
                        : "text-white/45 bg-white/[0.06] border-white/10"
                    }`}
                    title={isClean ? "Diputar tanpa iklan (ryu-lokal)" : "Kualitas server"}
                  >
                    {isClean && "⚡"}{item.quality}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── DOWNLOAD ── */}
        {data.downloads?.length > 0 && (
          <>
            <div className="h-px bg-white/[0.04] mb-5" />
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
              <span className="text-[9px] font-black text-cyan-200 uppercase tracking-[.18em]">Download</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {data.downloads.map((dl, idx) => (
                <a key={idx} href={dl.url ?? "#"} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.04] hover:bg-cyan-400/5 border border-white/5 hover:border-cyan-300/25 rounded-xl active:scale-95 group transition-colors duration-200">
                  <svg className="w-3.5 h-3.5 text-cyan-200 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="text-[11px] font-black uppercase tracking-tight text-white/35 group-hover:text-white truncate transition-colors duration-200">{dl.name ?? "Download"}</span>
                </a>
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

        {/* ── KOMENTAR ANIME (PostgreSQL VPS, bukan Supabase) ── */}
        <AnimeComments slug={slug} />

      </div>
    </div>
  );
}
