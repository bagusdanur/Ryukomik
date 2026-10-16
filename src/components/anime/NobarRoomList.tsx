"use client";

/**
 * NobarRoomList — daftar semua ruang nobar aktif (halaman /anime/nobar).
 *
 * Berbeda dari NobarCard (slide ke samping), di sini ditampilkan sebagai
 * daftar vertikal dengan thumbnail besar supaya mudah dipilih. Auto-refresh
 * 15 detik supaya ruang yang baru dibuka / sudah tutup langsung terlihat.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiRadio, FiUsers, FiArrowRight } from "react-icons/fi";

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
      {rooms.map((room) => (
        <button
          key={room.id}
          onClick={() => router.push(`/anime/nobar/${room.id}`)}
          className="group flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 text-left transition active:scale-[0.99]"
        >
          <span className="relative block h-[62px] w-[110px] shrink-0 overflow-hidden rounded-xl bg-white/[0.06]">
            {room.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={room.thumbnail}
                alt={stripSuffix(room.anime_title) || "Anime"}
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <span className="grid h-full w-full place-items-center text-white/20">
                <FiRadio size={20} />
              </span>
            )}
            <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded bg-rose-600/90 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">
              <span className="h-1 w-1 rounded-full bg-white" />
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
            <span className="mt-1 flex items-center gap-2 text-[10px] font-semibold text-white/45">
              <span className="flex items-center gap-1">
                <FiUsers size={10} />
                {room.member_count} nonton
              </span>
              {room.is_playing && <span className="text-cyan-300">▶ diputar</span>}
            </span>
          </span>

          <span className="flex shrink-0 items-center gap-1 rounded-lg bg-rose-500 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-white">
            Ikut <FiArrowRight size={12} />
          </span>
        </button>
      ))}
    </div>
  );
}
