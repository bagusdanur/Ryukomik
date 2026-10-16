"use client";

/**
 * NobarCard — daftar ruang nobar aktif untuk sebuah anime, di halaman detail.
 *
 * Biar orang bisa langsung join dari halaman anime tanpa harus masuk ke
 * episode dulu. Kalau tidak ada ruang aktif, komponen tidak menampilkan apa
 * pun (biar halaman tidak penuh kartu kosong).
 *
 * Poll 15 detik, berhenti saat tab disembunyikan.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiRadio, FiArrowRight } from "react-icons/fi";
import { socialRead } from "@/lib/social/client";

type Room = {
  id: string;
  episodeSlug: string;
  episodeTitle: string | null;
  hostName: string;
  playerLabel: string | null;
  isPlaying: boolean;
};

export default function NobarCard({ animeSlug }: { animeSlug: string }) {
  const router = useRouter();
  const [rooms, setRooms] = useState<{ room: Room; memberCount: number }[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = () =>
      socialRead<{ rooms: { room: Room; memberCount: number }[] }>(
        `/api/social/nobar?anime=${encodeURIComponent(animeSlug)}`,
      )
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

  return (
    <div className="px-5 mb-6">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
        </span>
        <span className="text-[10px] font-black uppercase tracking-[.18em] text-rose-200">Sedang nobar</span>
      </div>

      <div className="space-y-2">
        {rooms.map(({ room, memberCount }) => (
          <button
            key={room.id}
            onClick={() => router.push(`/anime/nobar/${room.id}`)}
            className="group flex w-full items-center gap-3 rounded-2xl border border-rose-400/25 bg-gradient-to-r from-rose-500/[0.14] to-rose-500/[0.02] px-3.5 py-3 text-left transition active:scale-[0.99]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-rose-400/30 bg-rose-500/15">
              <FiRadio className="text-rose-200" size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-black text-white">
                {room.episodeTitle?.replace(" Sub Indo", "") || "Episode"}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-white/45">
                <span className="truncate">Host: {room.hostName}</span>
                <span className="h-1 w-1 shrink-0 rounded-full bg-white/20" />
                <span className="shrink-0">
                  {memberCount > 0 ? `${memberCount} nonton` : "baru dibuka"}
                </span>
                {room.isPlaying && <span className="shrink-0 text-cyan-200">▶</span>}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 rounded-lg bg-rose-500 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-white">
              Ikut <FiArrowRight size={12} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
