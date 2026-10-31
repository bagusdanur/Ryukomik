"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import { getProxiedThumbnailUrl } from "@/lib/imageProxy";
import { useHistoryStore } from "@/store/historyStore";

type BookmarkItem = {
  slug: string;
  source?: string;
  title?: string;
  image?: string;
};

type FavoriteTabProps = {
  search?: string;
};

/** Meta update per seri, disimpan 12 jam supaya tidak memanggil backend terus. */
type SeriesUpdate = { at: string; chapter: number | null; fetchedAt: number };

const META_KEY = "rk_fav_updates_v1";
const META_TTL_MS = 12 * 60 * 60 * 1000;
/** Batas pemeriksaan per kunjungan: favorit bisa ratusan, jangan dibanjiri. */
const CHECK_PER_VISIT = 18;

function readMeta(): Record<string, SeriesUpdate> {
  try {
    const raw = JSON.parse(localStorage.getItem(META_KEY) || "{}");
    return raw && typeof raw === "object" ? (raw as Record<string, SeriesUpdate>) : {};
  } catch {
    return {};
  }
}

function writeMeta(meta: Record<string, SeriesUpdate>) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // storage penuh: sorting tetap jalan dengan data yang ada
  }
}

/** Nomor chapter dari "Chapter 336" / "Ch. 12.5" / slug chapter-336. */
function chapterNumber(value: unknown): number | null {
  const match = String(value ?? "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function relativeUpdate(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!Number.isFinite(diff) || diff < 0) return "baru update";
  if (diff < 3600) return `update ${Math.max(1, Math.floor(diff / 60))} menit lalu`;
  if (diff < 86400) return `update ${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `update ${Math.floor(diff / 86400)} hari lalu`;
  return `update ${new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}`;
}

export default function FavoriteTab({ search = "" }: FavoriteTabProps) {
  const [data, setData] = useState<BookmarkItem[]>([]);
  const [meta, setMeta] = useState<Record<string, SeriesUpdate>>({});
  const attempted = useRef<Set<string>>(new Set());
  const history = useHistoryStore((state) => state.history);

  const normalizeBookmark = (item: BookmarkItem): BookmarkItem =>
    item.source ? item : { ...item, source: "komiku" };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = JSON.parse(localStorage.getItem("bookmarks") ?? "[]");
    const normalized = Array.isArray(saved) ? saved.map(normalizeBookmark) : [];
    const id = requestAnimationFrame(() => {
      setData(normalized);
      setMeta(readMeta());
    });
    localStorage.setItem("bookmarks", JSON.stringify(normalized));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periksa update seri favorit: yang paling lama dicek didahulukan, maksimal
  // CHECK_PER_VISIT per kunjungan. Hasilnya disimpan agar kunjungan berikutnya
  // tidak memanggil backend lagi.
  useEffect(() => {
    if (data.length === 0) return;
    let cancelled = false;

    const pending = data
      .map((item) => ({ item, key: `${item.source || "komiku"}:${item.slug}` }))
      .filter(({ key }) => {
        if (attempted.current.has(key)) return false;
        const cached = meta[key];
        return !cached || Date.now() - cached.fetchedAt > META_TTL_MS;
      })
      .sort((a, b) => (meta[a.key]?.fetchedAt ?? 0) - (meta[b.key]?.fetchedAt ?? 0))
      .slice(0, CHECK_PER_VISIT);

    if (pending.length === 0) return;

    (async () => {
      const next: Record<string, SeriesUpdate> = { ...readMeta() };
      let changed = false;
      for (const { item, key } of pending) {
        attempted.current.add(key);
        try {
          const res = await fetch(
            `/api/series-thumb?source=${encodeURIComponent(item.source || "komiku")}&slug=${encodeURIComponent(item.slug)}`,
          );
          if (!res.ok) continue;
          const json = (await res.json()) as { latestChapterAt?: string | null; latestChapter?: number | null };
          if (json.latestChapterAt) {
            next[key] = {
              at: json.latestChapterAt,
              chapter: json.latestChapter ?? null,
              fetchedAt: Date.now(),
            };
            changed = true;
          }
        } catch {
          // biarkan, dicoba lagi di kunjungan berikutnya
        }
      }
      if (cancelled || !changed) return;
      writeMeta(next);
      setMeta(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [data, meta]);

  const handleRemove = (slug: string) => {
    const updated = data.filter((i) => i.slug !== slug);
    setData(updated);
    localStorage.setItem("bookmarks", JSON.stringify(updated));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? data.filter((item) => (item.title ?? "").toLowerCase().includes(q))
      : [...data];

    // Favorit yang baru update naik ke atas; yang belum diketahui tanggalnya
    // tetap di urutan semula (terbaru ditambahkan dulu), bukan dihapus.
    return list
      .map((item, index) => ({
        item,
        index,
        at: meta[`${item.source || "komiku"}:${item.slug}`]?.at
          ? Date.parse(meta[`${item.source || "komiku"}:${item.slug}`].at)
          : null,
      }))
      .sort((a, b) => {
        if (a.at && b.at) return b.at - a.at;
        if (a.at) return -1;
        if (b.at) return 1;
        return a.index - b.index;
      })
      .map((entry) => entry.item);
  }, [data, search, meta]);

  if (filtered.length === 0) {
    return <p className="rk-card-soft rounded-2xl py-10 text-center text-white/60">Tidak ada bookmark</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
      {filtered.map((item) => {
        const update = meta[`${item.source || "komiku"}:${item.slug}`];
        const latest = update?.chapter ?? null;
        const readEntry = history.find(
          (entry) =>
            entry.comicSlug === item.slug &&
            (entry.source || "komiku") === (item.source || "komiku"),
        );
        const lastRead = chapterNumber(readEntry?.lastChapter ?? readEntry?.lastChapterSlug);
        // Chapter baru = chapter terbaru di sumber lebih tinggi dari yang terakhir dibaca.
        const hasNewChapter = latest !== null && (lastRead === null || latest > lastRead);
        // Selisih chapter baru; dibulatkan ke bawah dan minimal 1.
        const newCount =
          latest !== null && lastRead !== null && latest > lastRead
            ? Math.max(1, Math.floor(latest - lastRead))
            : null;
        return (
          <div key={item.slug} className="relative group">
            {/* HAPUS */}
            <button
              onClick={() => handleRemove(item.slug)}
              className="absolute left-2 top-2 z-10 rounded-full bg-rose-500/90 p-2 text-xs text-white"
            >
              <FiTrash2 />
            </button>

            {hasNewChapter ? (
              <span className="absolute right-2 top-2 z-10 rounded-md bg-emerald-400 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-black">
                {newCount !== null ? `+${newCount} Ch` : "New Ch"}
              </span>
            ) : update?.at && Date.now() - Date.parse(update.at) < 7 * 24 * 60 * 60 * 1000 ? (
              <span className="absolute right-2 top-2 z-10 rounded-md bg-cyan-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-black">
                Update
              </span>
            ) : null}

            <a href={`/komik/${item.source}/${item.slug}`}>
              <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                <img referrerPolicy="no-referrer" src={getProxiedThumbnailUrl(item.image, item.source)} className="h-full w-full object-cover" alt={item.title ?? "Bookmark"} />
              </div>
              <p className="mt-2 text-sm font-bold leading-snug text-white/90 line-clamp-2 transition-colors duration-200 group-hover:text-cyan-100">{item.title}</p>
              {update?.at ? (
                <p className="mt-0.5 text-[10px] font-semibold text-cyan-200/70">{relativeUpdate(update.at)}</p>
              ) : null}
            </a>
          </div>
        );
      })}
    </div>
  );
}
