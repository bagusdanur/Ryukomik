"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiClock, FiPlay } from "react-icons/fi";
import { useHistoryStore } from "@/store/historyStore";

/**
 * "Lanjut Baca" — diambil dari riwayat baca lokal (zustand persist).
 * Tidak ada request jaringan sama sekali: instan, 0 egress.
 */
function relativeTime(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months} bulan lalu` : `${Math.floor(months / 12)} tahun lalu`;
}

function chapterLabel(chapter?: string, slug?: string): string {
  const raw = (chapter || "").trim();
  if (raw) return /^ch/i.test(raw) ? raw : `Ch. ${raw}`;
  const match = (slug || "").match(/(?:chapter|ch)[- _]?(\d+(?:\.\d+)?)/i);
  return match ? `Ch. ${match[1]}` : "Lanjut";
}

export default function ContinueReading() {
  const history = useHistoryStore((state) => state.history);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
  }, []);

  if (!mounted || !history.length) return null;

  const items = history.filter((item) => item.title && (item.lastChapterSlug || item.comicSlug)).slice(0, 8);
  if (!items.length) return null;

  return (
    <section className="mt-4 px-3 sm:px-6">
      <div className="mb-2.5 flex items-baseline gap-2">
        <span className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300/60">Kamu</span>
        <h2 className="text-[15px] font-black text-white">Lanjut Baca</h2>
        <Link
          href="/files?tab=history"
          className="ml-auto text-[11px] font-bold text-white/35 transition-colors hover:text-white/70"
        >
          Semua
        </Link>
      </div>

      <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
        {items.map((item) => {
          const href = item.lastChapterSlug
            ? `/chapter/${item.source || "komiku"}/${item.lastChapterSlug}`
            : `/komik/${item.source || "komiku"}/${item.comicSlug}`;
          const label = chapterLabel(item.lastChapter, item.lastChapterSlug);

          return (
            <Link
              key={`${item.comicSlug}-${item.lastChapterSlug}`}
              href={href}
              className="group flex w-[178px] shrink-0 gap-2 rounded-2xl border border-white/[0.07] bg-[var(--surface-1)] p-2 transition-colors hover:border-cyan-300/35"
            >
              <div className="relative h-[60px] w-[44px] shrink-0 overflow-hidden rounded-lg bg-white/[0.05]">
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[15px] font-black uppercase text-white/25">
                    {(item.title || "?").charAt(0)}
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/55 py-0.5 text-[8px] font-black text-cyan-200">
                  <FiPlay size={7} className="mr-0.5" /> {label}
                </span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p className="line-clamp-2 text-[10.5px] font-bold leading-tight text-white/90 transition-colors group-hover:text-cyan-100">
                  {item.title}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[8.5px] font-semibold text-white/35">
                  <FiClock size={8} />
                  {now ? relativeTime(item.updatedAt, now) : ""}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
