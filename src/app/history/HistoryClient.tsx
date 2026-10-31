"use client";

import { useHistoryStore } from "@/store/historyStore";
import HistoryThumb from "@/components/history/HistoryThumb";
import useHistoryThumbBackfill from "@/hooks/useHistoryThumbBackfill";

/** Judul seri dari slug, untuk data lama yang terlanjur menyimpan "Chapter N". */
function prettifySlug(slug?: string | null) {
  return (slug || "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayTitle(item: { title?: string | null; comicSlug?: string | null }) {
  const title = (item.title || "").trim();
  const chapterLike = !title || /^(chapter|ch\.?)\s*[\d.]/i.test(title);
  return chapterLike ? prettifySlug(item.comicSlug) : title;
}

function chapterHref(item: { source?: string | null; lastChapterSlug?: string | null }) {
  const source = item.source || "komiku";
  const slug = item.lastChapterSlug || "";
  if (source === "meionovels") return `/novel/chapter/${slug}`;
  return `/chapter/${source}/${slug}`;
}

export default function HistoryPage() {
  const history = useHistoryStore((state) => state.history);
  const clearHistory = useHistoryStore((state) => state.clearHistory);

  // Cover riwayat lama diisi bertahap (maks 12 per kunjungan) lewat cache.
  useHistoryThumbBackfill(history);

  return (
    <div className="rk-page px-4 pb-24 pt-20 text-white md:px-18">
      <div className="rk-shell">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-black">History</h1>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold hover:bg-rose-400"
          >
            Hapus
          </button>
        )}
      </div>

      <div className="mb-4 h-px bg-white/10" />

      {/* HISTORY LIST */}
      <div className="flex flex-col gap-3">
        {history.map((item, i) => (
          <a
            key={i}
            href={chapterHref(item)}
            className="rk-card-soft flex items-center gap-3 rounded-2xl p-3 transition hover:border-cyan-200/20"
          >
            <HistoryThumb
              thumbnail={item.thumbnail}
              title={displayTitle(item)}
              className="h-16 w-11"
            />

            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium md:text-base">
                {displayTitle(item)}
              </p>
              <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-cyan-200">
                {item.lastChapter ?? (item as any).chapter ?? ""}
              </p>
            </div>

            <span className="ml-2 whitespace-nowrap text-xs text-gray-300 md:text-sm">
              {(item as any).date || (item.updatedAt
                ? new Date(item.updatedAt).toLocaleDateString("id-ID")
                : "")}
            </span>
          </a>
        ))}
      </div>

      {history.length === 0 && (
        <p className="rk-card-soft mt-10 rounded-2xl py-10 text-center text-white/60">Belum ada history...</p>
      )}
      </div>
    </div>
  );
}
