"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SeriesCard from "@/components/SeriesCard";
import { useHistoryStore } from "@/store/historyStore";
import {
  backfillHistoryThumbnails,
  chapterNumberFrom,
  chaptersBehind,
  fetchSeriesMeta,
} from "@/utils/historyThumbnail";

/**
 * "Lanjut Baca" — dari riwayat baca lokal, memakai komponen kartu yang sama
 * dengan section lain supaya ukuran & tipografinya identik.
 * Chapter terbaru diambil dari /api/series-thumb (cache 1 jam, memo per sesi).
 */

const META_LIMIT = 6;

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

export default function ContinueReading() {
  const history = useHistoryStore((state) => state.history);
  const updateThumbs = useHistoryStore((state) => state.updateHistoryThumbs);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
  const [latest, setLatest] = useState<Record<string, number | null>>({});

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

  // Chapter terbaru untuk kartu yang tampil (maks 6, paralel, sudah di-cache).
  useEffect(() => {
    if (!mounted || !history.length) return;
    let cancelled = false;

    const targets = history.slice(0, META_LIMIT);
    void Promise.all(
      targets.map(async (item) => {
        const slug = String(item.comicSlug || "").trim();
        if (!slug) return null;
        const source = item.source || "komiku";
        const meta = await fetchSeriesMeta(source, slug);
        return { key: `${source}|${slug}`, latestChapter: meta.latestChapter };
      }),
    ).then((rows) => {
      if (cancelled) return;
      const next: Record<string, number | null> = {};
      for (const row of rows) {
        if (row) next[row.key] = row.latestChapter;
      }
      setLatest((prev) => ({ ...prev, ...next }));
    });

    return () => {
      cancelled = true;
    };
  }, [mounted, history]);

  if (!mounted || !history.length) return null;

  const items = history.filter((item) => item.title).slice(0, 10);
  if (!items.length) return null;

  return (
    <section className="mt-7 px-3 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
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

      <div className="no-scrollbar overflow-x-auto pb-3">
        <div className="grid auto-cols-[118px] grid-flow-col gap-3 sm:auto-cols-[138px] md:auto-cols-[150px]">
          {items.map((item) => {
            const source = item.source || "komiku";
            const slug = String(item.comicSlug || "").trim();
            const href = item.lastChapterSlug
              ? `/chapter/${source}/${item.lastChapterSlug}`
              : `/komik/${source}/${slug}`;

            const readChapter =
              chapterNumberFrom(item.lastChapter) ?? chapterNumberFrom(item.lastChapterSlug);
            const latestChapter = latest[`${source}|${slug}`] ?? null;
            const behind = chaptersBehind(readChapter, latestChapter);

            return (
              <SeriesCard
                key={`${slug}-${item.lastChapterSlug}`}
                href={href}
                title={item.title}
                image={item.thumbnail || undefined}
                source={source}
                eyebrow={readChapter !== null ? `Dibaca Ch. ${readChapter}` : undefined}
                sideEyebrow={
                  behind === null
                    ? undefined
                    : behind === 0
                      ? "Terbaru"
                      : `−${behind} ch`
                }
                meta={now ? relativeTime(item.updatedAt, now) : undefined}
                corner={
                  latestChapter !== null ? (
                    <span className="rk-cover-badge absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-[var(--accent-2)]">
                      Ch. {latestChapter}
                    </span>
                  ) : null
                }
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
