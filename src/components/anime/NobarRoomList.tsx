"use client";

/**
 * NobarRoomList — daftar semua ruang nobar aktif (halaman /anime/nobar).
 *
 * Berbeda dari NobarCard (slide ke samping), di sini ditampilkan sebagai
 * daftar vertikal dengan poster portrait supaya mudah dipilih. Auto-refresh
 * 10 detik dan langsung menyegarkan saat tab kembali aktif.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio, Users, ArrowRight, Play } from "lucide-react";
import { thumbUrl } from "@/lib/anime/thumb";

export type NobarListRoom = {
  id: string;
  episode_slug: string;
  episode_title: string | null;
  anime_slug: string | null;
  anime_title: string | null;
  thumbnail: string | null;
  host_name: string;
  player_label: string | null;
  is_playing: boolean;
  position_seconds: string | number | null;
  created_at: string;
  member_count: number;
};

const stripSuffix = (s?: string | null) => s?.replace(/\s*Sub(?:title)?\s*Indo\s*$/i, "").trim() || "";

export default function NobarRoomList({ rooms: initial }: { rooms: NobarListRoom[] }) {
  const router = useRouter();
  const [rooms, setRooms] = useState(initial);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = () =>
      fetch("/api/social/nobar?all=1", { cache: "no-store" })
        .then((r) => r.json())
        .then((data: { rooms?: { room: { id: string; episodeSlug: string; episodeTitle: string | null; animeSlug: string | null; animeTitle: string | null; thumbnail: string | null; hostName: string; playerLabel: string | null; isPlaying: boolean; createdAt: string }; memberCount: number }[] }) => {
          if (!alive || !data.rooms) return;
          setRooms(
            data.rooms.map(({ room, memberCount }) => ({
              id: room.id,
              episode_slug: room.episodeSlug,
              episode_title: room.episodeTitle,
              anime_slug: room.animeSlug,
              anime_title: room.animeTitle,
              thumbnail: room.thumbnail,
              host_name: room.hostName,
              player_label: room.playerLabel,
              is_playing: room.isPlaying,
              position_seconds: 0,
              created_at: room.createdAt,
              member_count: memberCount,
            })),
          );
        })
        .catch(() => {});

    const start = () => {
      if (timer) return;
      void load();
      timer = setInterval(() => void load(), 10_000);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    // Tab kembali aktif -> tarik data terbaru segera (tanpa tunggu interval).
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
  }, []);

  if (!rooms.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-12 text-center">
        <p className="text-sm font-bold text-white/70">Tidak ada nobar aktif</p>
        <p className="mt-1.5 text-[11px] font-semibold text-white/35">
          Semua ruang sudah selesai. Buka episode untuk memulai yang baru.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {rooms.map((room) => {
        const poster = thumbUrl(room.thumbnail);
        return (
          <button
            key={room.id}
            onClick={() => router.push(`/anime/nobar/${room.id}`)}
            className="group flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 text-left transition active:scale-[0.99]"
          >
            {/* Poster portrait, tinggi tetap */}
            <span className="relative block h-[84px] w-[58px] shrink-0 overflow-hidden rounded-xl bg-white/[0.06]">
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={poster}
                  alt={stripSuffix(room.anime_title) || "Anime"}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <span className="grid h-full w-full place-items-center text-white/20">
                  <Radio size={20} />
                </span>
              )}
              <span className="absolute left-1 top-1 flex items-center gap-1 rounded bg-rose-600/90 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">
                <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
                Live
              </span>
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-black text-white">
                {stripSuffix(room.anime_title) || stripSuffix(room.episode_title) || "Nobar"}
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-white/40">
                {room.anime_title ? stripSuffix(room.episode_title) || "Episode" : `Host: ${room.host_name}`}
              </span>
              <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-semibold text-white/45">
                <span className="flex items-center gap-1">
                  <Users size={10} />
                  {room.member_count} nonton
                </span>
                {room.is_playing && (
                  <span className="flex items-center gap-1 text-cyan-300">
                    <Play size={9} className="fill-cyan-300" />
                    diputar
                  </span>
                )}
                {room.player_label && <span className="truncate text-white/35">{room.player_label}</span>}
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-1 rounded-lg bg-rose-500 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-white">
              Ikut <ArrowRight size={12} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
