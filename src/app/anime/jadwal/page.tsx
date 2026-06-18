"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const HARI = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"] as const;
type Hari = (typeof HARI)[number];

const HARI_SHORT = {
  senin: "Sen", selasa: "Sel", rabu: "Rab",
  kamis: "Kam", jumat: "Jum", sabtu: "Sab", minggu: "Min",
} satisfies Record<Hari, string>;

type JadwalAnime = {
  slug?: string;
  thumbnail?: string;
  title?: string;
  status?: string;
  rating?: string;
  episodes?: string | number;
  type?: string;
  releaseTime?: string;
};

type JadwalData = Partial<Record<Hari, JadwalAnime[]>>;

type JadwalResponse = {
  success?: boolean;
  data?: JadwalData;
};

function getTodayHari(): Hari {
  const days = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
  return days[new Date().getDay()] as Hari;
}

export default function JadwalPage() {
  const [data, setData] = useState<JadwalData | null>(null);
  const [activeHari, setActiveHari] = useState<Hari>(getTodayHari());

  useEffect(() => {
    fetch("https://apiv2.ryukomik.web.id/animeid/jadwal")
      .then((r) => r.json())
      .then((res: JadwalResponse) => { if (res.success) setData(res.data ?? {}); });
  }, []);

  const animeList = data?.[activeHari] ?? [];
  const isLoading = !data;

  return (
    <div
      className="rk-page text-white pb-28"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <div className="relative z-10 max-w-lg mx-auto">

        {/* ── HERO ── */}
        <div className="px-5 pt-7 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            <span className="text-[10px] font-semibold tracking-[.18em] uppercase text-cyan-200/70">
              Jadwal Tayang
            </span>
          </div>
          <h1
            className="text-[32px] font-black leading-none tracking-tight mb-1"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Jadwal<br />
            <span className="text-cyan-200">Anime</span>
          </h1>
          <p className="text-xs text-white/25 font-light mb-5">Waktu tayang WIB · Sub indo</p>
        </div>

        {/* ── TAB HARI ── */}
        <div
          className="flex gap-1.5 px-5 mb-4 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {HARI.map((hari) => {
            const isActive = hari === activeHari;
            const isToday = hari === getTodayHari();
            return (
              <button
                key={hari}
                onClick={() => setActiveHari(hari)}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-2xl active:scale-95 relative ${
                  isActive
                    ? "bg-cyan-500"
                    : "rk-card-soft"
                }`}
              >
                {/* dot hari ini */}
                {isToday && !isActive && (
                  <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-cyan-300" />
                )}
                <span
                  className={`text-[11px] font-black tracking-wide ${isActive ? "text-white" : "text-white/40"}`}
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  {HARI_SHORT[hari]}
                </span>
                {data && (
                  <span className={`text-[9px] font-medium ${isActive ? "text-white/70" : "text-white/20"}`}>
                    {data[hari]?.length ?? 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── INFO HARI ── */}
        <div className="flex items-center justify-between px-5 mb-3">
          <span
            className="text-sm font-black tracking-widest capitalize"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            {activeHari}
          </span>
          <span className="text-xs text-white/30">
            {isLoading ? "..." : `${animeList.length} anime`}
          </span>
        </div>

        {/* ── LOADING SKELETON ── */}
        {isLoading && (
          <div className="flex flex-col px-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="w-12 h-16 rounded-xl bg-[#1c1c1c] flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[#1c1c1c] rounded w-3/4" />
                  <div className="h-2.5 bg-[#1c1c1c] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── LIST ANIME ── */}
        {!isLoading && (
          <div className="px-5 flex flex-col">
            {animeList.length === 0 && (
              <p className="text-white/20 text-sm text-center py-10">Tidak ada jadwal hari ini</p>
            )}
            {animeList.map((anime, i) => {
              const isDelayed = anime.status === "delayed";
              return (
                <Link
                  href={`/anime/detail/${anime.slug}`}
                  key={i}
                  className="group flex items-center gap-3 rounded-2xl border border-transparent px-2 py-3 hover:border-cyan-200/15 hover:bg-white/[0.04]"
                >
                  {/* thumbnail */}
                  <div className="w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/5 relative">
                    <img
                      src={anime.thumbnail}
                      alt={anime.title}
                      className="w-full h-full object-cover"
                    />
                    {isDelayed && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.6)" }}
                      >
                        <span className="text-[8px] font-black text-amber-400">LIBUR</span>
                      </div>
                    )}
                  </div>

                  {/* info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white/85 leading-snug line-clamp-2 mb-1.5">
                      {anime.title}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* rating */}
                      {anime.rating && anime.rating !== "-" && (
                        <span className="text-[9px] text-yellow-400 font-bold">
                          ★ {anime.rating}
                        </span>
                      )}
                      {/* episodes */}
                      <span className="text-[9px] text-white/30">
                        EP {anime.episodes}
                      </span>
                      {/* type badge */}
                      <span className="rounded bg-cyan-400/10 px-1.5 py-0.5 text-[8px] font-bold text-cyan-200">
                        {anime.type}
                      </span>
                    </div>
                  </div>

                  {/* jam tayang / delay */}
                  <div className="flex-shrink-0 text-right">
                    {isDelayed ? (
                      <span className="text-[9px] text-amber-400 font-semibold leading-tight block max-w-[70px] text-right">
                        {anime.releaseTime}
                      </span>
                    ) : (
                      <span className="text-[11px] font-black text-cyan-200">
                        {anime.releaseTime?.replace(" WIB", "")}
                      </span>
                    )}
                    {!isDelayed && (
                      <span className="text-[8px] text-white/20 block">WIB</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
