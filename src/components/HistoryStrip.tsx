"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SeriesCard from "@/components/SeriesCard";
import { useHistoryStore } from "@/store/historyStore";
import { relativeTime } from "@/lib/social/relativeTime";
import type { ReadHistoryItem } from "@/types/user";

/**
 * "Lanjut Baca" — strip riwayat baca di halaman depan, memakai SeriesCard yang
 * sama dengan UpdateList supaya desainnya konsisten.
 * Data dari historyStore (localStorage, per pengunjung) — tidak ada query server,
 * jadi nol tambahan egress Supabase.
 * Riwayat lama tanpa thumbnail di-backfill sekali lewat /api/series-thumb
 * (endpoint detail backend yang sudah di-cache), lalu disimpan balik ke store.
 */

const MAX_CARDS = 12;
const MAX_BACKFILL_PER_SESSION = 6;

function chapterHref(item: ReadHistoryItem): string {
  const source = item.source || "komiku";
  const slug = item.lastChapterSlug || "";
  if (source === "meionovels") return `/novel/chapter/${slug}`;
  return `/chapter/${source}/${slug}`;
}

export default function HistoryStrip() {
  const history = useHistoryStore((state) => state.history);
  const updateThumbs = useHistoryStore((state) => state.updateHistoryThumbs);
  const [mounted, setMounted] = useState(false);
  const attempted = useRef<Set<string>>(new Set());

  // localStorage hanya ada di browser; tunda render agar tidak hydration mismatch.
  useEffect(() => setMounted(true), []);

  const items = history.slice(0, MAX_CARDS);

  useEffect(() => {
    if (!mounted) return;
    const missing = items.filter((item) => {
      if (!item.comicSlug || item.thumbnail) return false;
      if ((item.source || "komiku") === "project") return false;
      const key = `${item.source || "komiku"}|${item.comicSlug}`;
      if (attempted.current.has(key)) return false;
      attempted.current.add(key);
      return true;
    });
    if (!missing.length) return;

    let cancelled = false;
    (async () => {
      const found: { comicSlug: string; thumbnail: string }[] = [];
      // Berurutan + dibatasi: sekali jalan per sesi, setelah itu tidak diminta lagi.
      for (const item of missing.slice(0, MAX_BACKFILL_PER_SESSION)) {
        try {
          const res = await fetch(
            `/api/series-thumb?source=${encodeURIComponent(item.source || "komiku")}&slug=${encodeURIComponent(item.comicSlug)}`,
          );
          if (!res.ok) continue;
          const json = (await res.json()) as { thumbnail?: string | null };
          if (json.thumbnail) {
            found.push({ comicSlug: item.comicSlug, thumbnail: json.thumbnail });
          }
        } catch {
          // biarkan kosong — kartu tetap tampil dengan placeholder "No Image"
        }
      }
      if (!cancelled && found.length) updateThumbs(found);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, history, updateThumbs]);

  if (!mounted || items.length === 0) return null;

  return (
    <section className="mt-6 px-3">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/60">
            Riwayat Baca
          </p>
          <h3 className="rk-section-title text-xl font-black">Lanjut Baca</h3>
        </div>
        <Link
          prefetch={false}
          href="/history"
          className="rk-chip rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-200 hover:border-cyan-200/40 hover:text-cyan-100"
        >
          Lihat Semua
        </Link>
      </div>

      <div className="overflow-x-auto pb-3 no-scrollbar">
        <div className="grid auto-cols-[118px] grid-flow-col gap-3 sm:auto-cols-[138px] md:auto-cols-[150px]">
          {items.map((item) => (
            <SeriesCard
              key={`${item.source || "komiku"}-${item.comicSlug}`}
              href={chapterHref(item)}
              title={
                String(item.title || "").trim() &&
                !/^(chapter|ch\.?)\s*[\d.]/i.test(String(item.title || "").trim())
                  ? item.title
                  : (item.comicSlug || "")
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())
              }
              image={item.thumbnail}
              eyebrow={item.lastChapter || "Lanjut baca"}
              meta={relativeTime(new Date(item.updatedAt).toISOString())}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
