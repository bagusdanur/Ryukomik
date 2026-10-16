"use client";

/**
 * NobarCard — ruang nobar aktif, ditampilkan sebagai slide ke samping.
 *
 * Dipakai di dua tempat:
 *  - Halaman utama anime (`<NobarCard />`): semua ruang aktif dari anime mana
 *    pun, plus tombol "Lihat semua" menuju /anime/nobar.
 *  - Halaman detail anime (`<NobarCard animeSlug="..." />`): hanya ruang anime
 *    itu, tanpa tombol "Lihat semua".
 *
 * Poster anime asli berbentuk portrait (2:3), jadi ditampilkan utuh dalam
 * bingkai portrait — bukan dipaksa 16:9 yang membuatnya terpotong. Gambar
 * dialihkan lewat /api/anime/thumb supaya tetap tampil walau situs sumber
 * diblokir di jaringan pengguna.
 *
 * Refresh: polling 10 detik, DAN langsung menyegarkan begitu tab kembali aktif
 * (visibilitychange) — jadi ruang baru muncul tanpa perlu reload manual.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Radio, ArrowRight, Users, Play, Signal } from "lucide-react";
import { socialRead } from "@/lib/social/client";
import { thumbUrl } from "@/lib/anime/thumb";

type Room = {
  id: string;
  episodeSlug: string;
  episodeTitle: string | null;
  animeSlug: string | null;
  animeTitle: string | null;
  thumbnail: string | null;
  hostName: string;
  playerLabel: string | null;
  isPlaying: boolean;
};

const stripSuffix = (s?: string | null) => s?.replace(/\s*Sub(?:title)?\s*Indo\s*$/i, "").trim() || "";

/** `animeSlug` = daftar ruang anime itu (halaman detail).
 *  Tanpa prop = semua ruang aktif (halaman utama anime). */
export default function NobarCard({ animeSlug }: { animeSlug?: string }) {
  const router = useRouter();
  const [rooms, setRooms] = useState<{ room: Room; memberCount: number }[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const endpoint = animeSlug
      ? `/api/social/nobar?anime=${encodeURIComponent(animeSlug)}`
      : "/api/social/nobar?all=1";

    const load = () =>
      socialRead<{ rooms: { room: Room; memberCount: number }[] }>(endpoint)
        .then((data) => {
          if (alive) setRooms(data.rooms || []);
        })
        .catch(() => {})
        .finally(() => alive && setReady(true));

    const start = () => {
      if (timer) return;
      void load();
      timer = setInterval(() => void load(), 10_000);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    // Begitu tab kembali aktif, tarik data terbaru SEKARANG (bukan menunggu
    // interval berikutnya) supaya ruang baru langsung kelihatan tanpa refresh.
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        stop();
        start();
      } else {
        stop();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [animeSlug]);

  // Tidak ada ruang aktif: jangan tampilkan apa-apa.
  if (!ready || !rooms.length) return null;

  const showAll = !animeSlug;

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="mb-2.5 flex items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-[.18em] text-rose-200">Sedang nobar</span>
          <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-white/45">
            {rooms.length}
          </span>
        </div>
        {showAll && (
          <Link
            href="/anime/nobar"
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-200/80 active:opacity-60"
          >
            Lihat semua <ArrowRight size={11} />
          </Link>
        )}
      </div>

      {/* Slide ke samping */}
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {rooms.map(({ room, memberCount }) => {
          const poster = thumbUrl(room.thumbnail);
          return (
            <button
              key={room.id}
              onClick={() => router.push(`/anime/nobar/${room.id}`)}
              className="group w-[132px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition active:scale-[0.97]"
            >
              {/* Poster portrait 2:3 (bentuk asli poster anime) */}
              <span className="relative block aspect-[2/3] w-full overflow-hidden bg-white/[0.06]">
                {poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={poster}
                    alt={stripSuffix(room.animeTitle) || "Anime"}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-white/20">
                    <Radio size={22} />
                  </span>
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-transparent" />
                {/* LIVE */}
                <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-md bg-rose-600/90 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white backdrop-blur">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
                  Live
                </span>
                {/* Penonton */}
                <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[8px] font-bold text-white/90 backdrop-blur">
                  <Users size={9} />
                  {memberCount}
                </span>
                {/* Judul di gradient bawah */}
                <span className="absolute inset-x-0 bottom-0 line-clamp-2 px-2 pb-1.5 text-[10px] font-black leading-tight text-white drop-shadow">
                  {stripSuffix(room.animeTitle) || stripSuffix(room.episodeTitle) || "Nobar"}
                </span>
              </span>

              {/* Info */}
              <span className="block px-2 py-1.5">
                <span className="block truncate text-[9px] font-semibold text-white/45">
                  {room.animeTitle
                    ? stripSuffix(room.episodeTitle) || "Episode"
                    : `Host: ${room.hostName}`}
                </span>
                <span className="mt-1 flex items-center justify-between gap-1">
                  <span className="flex min-w-0 items-center gap-1 text-[9px] font-semibold text-white/35">
                    {room.isPlaying ? (
                      <>
                        <Play size={9} className="shrink-0 fill-cyan-300 text-cyan-300" />
                        <span className="truncate text-cyan-200/80">diputar</span>
                      </>
                    ) : room.playerLabel ? (
                      <>
                        <Signal size={9} className="shrink-0" />
                        <span className="truncate">{room.playerLabel}</span>
                      </>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-0.5 rounded-lg bg-rose-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                    Ikut
                  </span>
                </span>
              </span>
            </button>
          );
        })}

        {/* Kartu "lihat semua" di ujung slide */}
        {showAll && (
          <Link
            href="/anime/nobar"
            className="grid w-[92px] shrink-0 snap-start place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-white/45 transition active:scale-[0.97]"
          >
            <span className="flex flex-col items-center gap-1.5">
              <ArrowRight size={18} />
              <span className="text-[9px] font-black uppercase tracking-wider">Lihat semua</span>
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
