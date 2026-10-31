"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, Trash2 } from "lucide-react";
import { useWatchHistoryStore } from "@/store/watchHistoryStore";

function timeAgo(timestamp: number) {
  const diff = Math.max(0, Date.now() - timestamp) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return new Date(timestamp).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

/** "Lanjut Tonton" — riwayat anime/donghua dari localStorage, nol query server. */
export default function ContinueWatching() {
  const history = useWatchHistoryStore((state) => state.history);
  const remove = useWatchHistoryStore((state) => state.removeWatchHistory);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || history.length === 0) return null;

  const items = history.slice(0, 12);

  return (
    <section className="mx-5 mt-6">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/60">
            Riwayat Tonton
          </p>
          <h2 className="text-lg font-black text-white">Lanjut Tonton</h2>
        </div>
        <Link
          href="/tonton"
          prefetch={false}
          className="rk-chip rounded-full px-3 py-1 text-[11px] font-bold text-white/70"
        >
          Semua
        </Link>
      </div>

      <div className="overflow-x-auto pb-3 no-scrollbar">
        <div className="grid auto-cols-[128px] grid-flow-col gap-3 sm:auto-cols-[150px]">
          {items.map((item) => (
            <div key={item.key} className="group relative">
              <Link
                prefetch={false}
                href={`/${item.type === "donghua" ? "donghua" : "anime"}/episode/${item.episodeSlug}`}
                className="block overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-white/5">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/20">
                      <Play size={22} />
                    </div>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <span className="rounded-full bg-cyan-500 p-2 text-black">
                      <Play size={16} />
                    </span>
                  </span>
                  {item.episodeLabel && (
                    <span className="absolute bottom-1 left-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
                      {item.episodeLabel}
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[10px] text-white/45">{timeAgo(item.updatedAt)}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => remove(item.key)}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1.5 text-white/70 opacity-0 transition-opacity hover:text-rose-300 group-hover:opacity-100"
                aria-label="Hapus riwayat"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
