"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useWatchHistoryStore } from "@/store/watchHistoryStore";

function timeAgo(timestamp: number) {
  const diff = Math.max(0, Date.now() - timestamp) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return new Date(timestamp).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

const ACCENT: Record<string, string> = { anime: "#22d3ee", donghua: "#ff9f1c" };

/**
 * "Lanjut Tonton" — riwayat anime/donghua dari localStorage, nol query server.
 * Kartunya sengaja memakai grid 3 kolom + rasio 2:3 yang sama dengan kartu
 * Anime/Donghua di halaman /tonton supaya ukurannya konsisten.
 */
export default function ContinueWatching() {
  const history = useWatchHistoryStore((state) => state.history);
  const remove = useWatchHistoryStore((state) => state.removeWatchHistory);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || history.length === 0) return null;

  const items = history.slice(0, 12);

  return (
    <section className="mt-7 scroll-mt-28">
      <div className="mb-3 flex items-end justify-between gap-3 px-5">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black">Lanjut Tonton</h2>
          <p className="text-[10px] text-white/35">Riwayat tonton perangkat ini</p>
        </div>
        <Link
          prefetch={false}
          href="/riwayat-tonton"
          className="text-[10px] font-bold uppercase tracking-widest text-white/45 transition hover:text-white"
        >
          Lihat semua
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 px-5">
        {items.map((item) => (
          <Link
            prefetch={false}
            key={item.key}
            href={`/${item.type === "donghua" ? "donghua" : "anime"}/episode/${item.episodeSlug}`}
            className="rk-card-soft group block overflow-hidden rounded-2xl"
          >
            <div className="relative" style={{ aspectRatio: "2/3" }}>
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/5 text-white/20">
                  <span className="text-[10px] font-black uppercase tracking-widest">No Image</span>
                </div>
              )}

              <div className="absolute left-1.5 top-1.5">
                <div
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
                  style={{ background: ACCENT[item.type] || ACCENT.anime }}
                >
                  <span className="text-[8px] font-black leading-none tracking-wide text-black">
                    {item.type === "donghua" ? "DONGHUA" : "ANIME"}
                  </span>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#090a12] via-[#090a12]/85 to-transparent px-2 pb-2 pt-8">
                <div className="mb-0.5 flex items-center gap-1">
                  <div className="h-1 w-1 rounded-full" style={{ background: "#4ade80" }} />
                  <span className="text-[7px] font-semibold uppercase tracking-widest text-white/40">
                    {item.episodeLabel ? `${item.episodeLabel} · ` : ""}
                    {timeAgo(item.updatedAt)}
                  </span>
                </div>
                <p className="line-clamp-2 text-[10px] font-bold leading-snug text-white">
                  {item.title}
                </p>
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  remove(item.key);
                }}
                className="absolute right-1.5 top-1.5 rounded-md border border-white/10 bg-black/60 p-1 text-white/60 opacity-0 transition-colors hover:text-rose-300 group-hover:opacity-100"
                aria-label={`Hapus riwayat ${item.title}`}
              >
                <Trash2 size={10} />
              </button>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
