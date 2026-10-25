"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useHistoryStore } from "@/store/historyStore";
import { backfillHistoryThumbnails } from "@/utils/historyThumbnail";

/**
 * "Lanjut Baca" — dari riwayat baca lokal (zustand persist), tanpa request
 * tambahan selain backfill cover yang di-cache.
 */
function relativeTime(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes}m lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}h lalu`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}bl lalu` : `${Math.floor(months / 12)}th lalu`;
}

function chapterLabel(chapter?: string, slug?: string): string {
  const raw = (chapter || "").trim();
  if (raw) return /^ch/i.test(raw) ? raw : `Ch. ${raw}`;
  const match = (slug || "").match(/(?:chapter|ch)[- _]?(\d+(?:\.\d+)?)/i);
  return match ? `Ch. ${match[1]}` : "Lanjut";
}

/** Warna placeholder stabil per judul, supaya tidak terlihat acak. */
function placeholderTone(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) hash = (hash * 31 + title.charCodeAt(i)) % 360;
  return `linear-gradient(150deg, hsl(${hash} 45% 22%), hsl(${(hash + 40) % 360} 35% 12%))`;
}

export default function ContinueReading() {
  const history = useHistoryStore((state) => state.history);
  const updateThumbs = useHistoryStore((state) => state.updateHistoryThumbs);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
  }, []);

  // Riwayat lama belum punya cover — isi sekali per sesi (maks 8, hasil di-cache).
  useEffect(() => {
    if (!mounted || !history.length) return;
    let cancelled = false;
    void backfillHistoryThumbnails(history, 8).then((found) => {
      if (!cancelled && found.length) updateThumbs(found);
    });
    return () => {
      cancelled = true;
    };
  }, [mounted, history, updateThumbs]);

  if (!mounted || !history.length) return null;

  const items = history
    .filter((item) => item.title && (item.lastChapterSlug || item.comicSlug))
    .slice(0, 10);

  if (!items.length) return null;

  return (
    <section className="mt-5 px-3 sm:px-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/60">Kamu</p>
          <h3 className="rk-section-title text-xl font-black">Lanjut Baca</h3>
        </div>
        <Link
          href="/files?tab=history"
          className="rk-chip rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-200 hover:border-cyan-200/40 hover:text-cyan-100"
        >
          View All
        </Link>
      </div>

      <div className="no-scrollbar -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
        {items.map((item) => {
          const href = item.lastChapterSlug
            ? `/chapter/${item.source || "komiku"}/${item.lastChapterSlug}`
            : `/komik/${item.source || "komiku"}/${item.comicSlug}`;
          const label = chapterLabel(item.lastChapter, item.lastChapterSlug);
          const title = item.title || "";

          return (
            <Link
              key={`${item.comicSlug}-${item.lastChapterSlug}`}
              href={href}
              className="group w-[106px] shrink-0 snap-start sm:w-[118px]"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.04]">
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover object-[center_18%] transition-transform duration-300 group-hover:scale-[1.04]"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{ background: placeholderTone(title) }}
                  >
                    <span className="text-2xl font-black text-white/25">
                      {title.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <span className="absolute inset-x-1 bottom-1 rounded-md bg-black/72 px-1.5 py-0.5 text-center text-[8.5px] font-black leading-none text-cyan-200 backdrop-blur-sm">
                  {label}
                </span>
              </div>

              <p className="mt-1.5 line-clamp-2 text-[10.5px] font-bold leading-tight text-white/85 transition-colors group-hover:text-cyan-100">
                {title}
              </p>
              <p className="mt-0.5 text-[8.5px] font-semibold text-white/30">
                {now ? relativeTime(item.updatedAt, now) : ""}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
