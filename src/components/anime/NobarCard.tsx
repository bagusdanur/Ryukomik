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
 * Tiap kartu menampilkan thumbnail anime (16:9), judul, episode, host, jumlah
 * penonton, dan tombol IKUT. Kalau tidak ada ruang aktif, komponen tidak
 * menampilkan apa pun supaya halaman tidak penuh kartu kosong.
 *
 * Poll 15 detik, berhenti saat tab disembunyikan.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiRadio, FiArrowRight, FiUsers } from "react-icons/fi";
import { socialRead } from "@/lib/social/client";

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
      timer = setInterval(() => void load(), 15_000);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());

    onVisibility();
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
            Lihat semua <FiArrowRight size={11} />
          </Link>
        )}
      </div>

      {/* Slide ke samping */}
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {rooms.map(({ room, memberCount }) => (
          <button
            key={room.id}
            onClick={() => router.push(`/anime/nobar/${room.id}`)}
            className="group w-[168px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition active:scale-[0.97]"
          >
            {/* Thumbnail 16:9 */}
            <span className="relative block aspect-video w-full overflow-hidden bg-white/[0.06]">
              {room.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={room.thumbnail}
                  alt={stripSuffix(room.animeTitle) || "Anime"}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <span className="grid h-full w-full place-items-center text-white/20">
                  <FiRadio size={22} />
                </span>
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              {/* LIVE badge */}
              <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-rose-600/90 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white backdrop-blur">
                <span className="h-1 w-1 rounded-full bg-white" />
                Live
              </span>
              {/* Penonton */}
              <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[8px] font-bold text-white/90 backdrop-blur">
                <FiUsers size={9} />
                {memberCount}
              </span>
              {/* Judul di atas gradient */}
              <span className="absolute inset-x-0 bottom-0 line-clamp-2 px-2 pb-1.5 text-[11px] font-black leading-tight text-white drop-shadow">
                {stripSuffix(room.animeTitle) || stripSuffix(room.episodeTitle) || "Nobar"}
              </span>
            </span>

            {/* Info */}
            <span className="block px-2.5 py-2">
              <span className="block truncate text-[10px] font-semibold text-white/45">
                {room.animeTitle
                  ? stripSuffix(room.episodeTitle) || "Episode"
                  : `Host: ${room.hostName}`}
              </span>
              <span className="mt-1.5 flex items-center justify-between gap-1">
                <span className="flex min-w-0 items-center gap-1 truncate text-[9px] font-semibold text-white/35">
                  {room.animeTitle && <span className="truncate">Host: {room.hostName}</span>}
                  {room.isPlaying && <span className="shrink-0 text-cyan-300">▶</span>}
                </span>
                <span className="flex shrink-0 items-center gap-0.5 rounded-lg bg-rose-500 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white">
                  Ikut
                </span>
              </span>
            </span>
          </button>
        ))}

        {/* Kartu "lihat semua" di ujung slide */}
        {showAll && (
          <Link
            href="/anime/nobar"
            className="grid w-[88px] shrink-0 snap-start place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-white/45 transition active:scale-[0.97]"
          >
            <span className="flex flex-col items-center gap-1.5">
              <FiArrowRight size={18} />
              <span className="text-[9px] font-black uppercase tracking-wider">Lihat semua</span>
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
