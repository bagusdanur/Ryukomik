"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { getWatchEpisodeHref, useWatchHistoryStore, type WatchType } from "@/store/watchHistoryStore";
import { ADULT_ENABLED } from "@/config/siteMode";
import { ADULT_PREF_EVENT, isAdultHidden } from "@/utils/adultFilter";
import AdultCoverGuard from "@/components/adult/AdultCoverGuard";

const ACCENT: Record<string, string> = { anime: "#22d3ee", donghua: "#ff9f1c", hentai: "#f43f5e" };
const LABEL: Record<string, string> = { anime: "ANIME", donghua: "DONGHUA", hentai: "18+" };

function timeAgo(timestamp: number) {
  const diff = Math.max(0, Date.now() - timestamp) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return new Date(timestamp).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

const BASE_FILTERS: { key: "all" | WatchType; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "anime", label: "Anime" },
  { key: "donghua", label: "Donghua" },
];

export default function RiwayatTontonClient() {
  const history = useWatchHistoryStore((state) => state.history);
  const remove = useWatchHistoryStore((state) => state.removeWatchHistory);
  const clear = useWatchHistoryStore((state) => state.clearWatchHistory);
  const [mounted, setMounted] = useState(false);
  const [adultHidden, setAdultHidden] = useState(true);
  const [filter, setFilter] = useState<"all" | WatchType>("all");

  useEffect(() => {
    setMounted(true);
    setAdultHidden(isAdultHidden());
    const onPref = () => {
      const hidden = isAdultHidden();
      setAdultHidden(hidden);
      if (hidden) setFilter((prev) => (prev === "hentai" ? "all" : prev));
    };
    window.addEventListener(ADULT_PREF_EVENT, onPref);
    return () => window.removeEventListener(ADULT_PREF_EVENT, onPref);
  }, []);

  const filters = useMemo(
    () =>
      ADULT_ENABLED && !adultHidden
        ? [...BASE_FILTERS, { key: "hentai" as const, label: "Dewasa" }]
        : BASE_FILTERS,
    [adultHidden],
  );

  const visibleHistory = useMemo(
    () => (adultHidden ? history.filter((item) => item.type !== "hentai") : history),
    [history, adultHidden],
  );

  const items = useMemo(
    () => (filter === "all" ? visibleHistory : visibleHistory.filter((item) => item.type === filter)),
    [visibleHistory, filter],
  );

  return (
    <div className="rk-page px-4 pb-24 pt-20 text-white md:px-18">
      <div className="rk-shell">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">Riwayat Tonton</h1>
            <p className="mt-1 text-xs text-white/45">
              Tersimpan di perangkat ini. Klik kartu untuk melanjutkan episode terakhir.
            </p>
          </div>
          {mounted && history.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold hover:bg-rose-400"
            >
              Hapus semua
            </button>
          )}
        </div>

        <div className="mb-4 h-px bg-white/10" />

        <div className="mb-4 flex gap-1 rounded-2xl border border-white/10 bg-white/[.03] p-1 w-fit">
          {filters.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setFilter(entry.key)}
              className={`rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors ${
                filter === entry.key
                  ? "bg-cyan-500/20 text-cyan-200"
                  : "text-white/45 hover:text-white/80"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {!mounted ? null : items.length === 0 ? (
          <p className="rk-card-soft rounded-2xl py-10 text-center text-white/60">
            Belum ada riwayat tonton.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {items.map((item) => (
              <div key={item.key} className="group relative">
                <Link
                  prefetch={false}
                  href={getWatchEpisodeHref(item.type, item.episodeSlug)}
                  className="rk-card-soft block overflow-hidden rounded-2xl"
                >
                  <div className="relative" style={{ aspectRatio: "2/3" }}>
                    <AdultCoverGuard adult={item.type === "hentai"} revealKey="watch-hentai">
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
                        <div className="flex h-full w-full items-center justify-center bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/20">
                          No Image
                        </div>
                      )}
                    </AdultCoverGuard>

                    <div className="absolute left-1.5 top-1.5">
                      <div
                        className="rounded-md px-1.5 py-0.5"
                        style={{ background: ACCENT[item.type] || ACCENT.anime }}
                      >
                        <span className="text-[8px] font-black leading-none tracking-wide text-black">
                          {LABEL[item.type] || "ANIME"}
                        </span>
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#090a12] via-[#090a12]/85 to-transparent px-2 pb-2 pt-8">
                      <p className="line-clamp-2 text-[10px] font-bold leading-snug text-white">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-[7px] font-semibold uppercase tracking-widest text-white/40">
                        {item.episodeLabel ? `${item.episodeLabel} · ` : ""}
                        {timeAgo(item.updatedAt)}
                      </p>
                    </div>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => remove(item.key)}
                  className="absolute right-1.5 top-1.5 rounded-md border border-white/10 bg-black/60 p-1 text-white/60 transition-colors hover:text-rose-300 md:opacity-0 md:group-hover:opacity-100"
                  aria-label={`Hapus riwayat ${item.title}`}
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
