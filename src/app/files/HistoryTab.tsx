"use client";

import { useCallback, useEffect, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import { useHistoryStore } from "@/store/historyStore";
import type { ReadHistoryItem } from "@/types/user";


type HistoryTabProps = {
  search?: string;
};

function timeAgo(timestamp?: number) {
  const now = new Date();
  const past = new Date(Number(timestamp));
  const diff = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diff < 60) return `${diff} detik lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;

  return past.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function HistoryTab({ search = "" }: HistoryTabProps) {
  const historyStore = useHistoryStore((state) => state.history);
  const removeHistory = useHistoryStore((state) => state.removeHistory);
  const [data, setData] = useState<ReadHistoryItem[]>([]);
  const [confirm, setConfirm] = useState<ReadHistoryItem | null>(null); // item yang mau dihapus


  const formatTitleFromSlug = useCallback((slug?: string) => {
  if (!slug) return "Unknown";

  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}, []);

const extractChapter = useCallback((text?: string, slug?: string) => {
  let raw = "";

  // 1. Ambil dari text dulu jika mengandung kata "Chapter" atau "Ch"
  if (text) {
    const match = text.match(/(?:chapter|ch)\s*(\d+(\.\d+)?)/i);
    if (match) {
      raw = match[1];
    } else {
      // Jika text hanya mengandung angka di akhir (biasanya "Judul 01")
      const endMatch = text.match(/(\d+(\.\d+)?)$/);
      if (endMatch) {
        raw = endMatch[1];
      }
    }
  }

  // 2. Fallback dari slug
  if (!raw && slug) {
    // Cari pola "chapter-X" atau "ch-X"
    const match = slug.match(/(?:chapter|ch)[-/](\d+(\.\d+)?)/i);
    if (match) {
      raw = match[1];
    } else {
      // Fallback: ambil angka terakhir di slug jika ada
      const lastNumMatch = slug.match(/(\d+)(?!.*\d)/);
      if (lastNumMatch) {
        raw = lastNumMatch[1];
      }
    }
  }

  // 🔥 POTONG ANGKA SETELAH TITIK
  if (raw.includes(".")) {
    raw = raw.split(".")[0];
  }

  // Hapus leading zero (misal "01" -> "1")
  if (raw) {
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      return `Ch. ${num}`;
    }
  }

  return raw ? `Ch. ${raw}` : "Ch. 1";
}, []);

const cleanTitle = useCallback((title?: string) => {
  if (!title) return "Unknown";

  return title
    .replace(/^kiryuu\//i, "")
    .replace(/^komikid\//i, "")
    .replace(/^komiku\//i, "")
    .split("/")[0]; // ambil judul doang
}, []);

  const normalizeHistory = useCallback((item: ReadHistoryItem): ReadHistoryItem => {
  return {
    ...item,
    source: item.source || "komiku",

    title: cleanTitle(
  item.title || formatTitleFromSlug(item.comicSlug)
),

    updatedAt: Number(item.updatedAt || (item as any).date) || Date.now(),

    lastChapterSlug: item.lastChapterSlug || "",

    lastChapter: extractChapter(
      item.lastChapter,
      item.lastChapterSlug
    ), // ✅ FIX CHAPTER
  };
}, [cleanTitle, extractChapter, formatTitleFromSlug]);

 useEffect(() => {
  try {
    const normalized = historyStore.map(normalizeHistory)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    const id = requestAnimationFrame(() => setData(normalized));
    return () => cancelAnimationFrame(id);
  } catch {
    const id = requestAnimationFrame(() => setData([]));
    return () => cancelAnimationFrame(id);
  }
}, [normalizeHistory, historyStore]);

  const deleteItem = () => {
    if (!confirm) return;
    removeHistory(confirm.comicSlug);
    setConfirm(null);
  };

  const filtered = data.filter((item) =>
    `${item.title} ${item.lastChapter}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (filtered.length === 0) {
    return <p className="rk-card-soft rounded-2xl py-10 text-center text-white/60">Belum ada history</p>;
  }

  return (
    <>
      {/* LIST */}
      <div className="flex flex-col gap-3">
        {filtered.map((item, i) => (
          <a
            key={i}
            href={`/chapter/${item.source}/${item.lastChapterSlug}`}
            className="rk-card-soft group flex items-center justify-between rounded-2xl p-3 transition-colors duration-200 hover:border-cyan-200/20"
          >
            {/* LEFT */}
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-sm font-medium line-clamp-2">
                {item.title}
              </span>
              <span className="text-xs font-semibold text-cyan-200 line-clamp-1">
                {item.lastChapter}
              </span>
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-3 ml-3">
              <span className="text-xs text-white/50 whitespace-nowrap">
                {timeAgo(item.updatedAt)}
              </span>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirm(item);
                }}
                className="opacity-60 transition-all duration-200 hover:text-rose-300 hover:opacity-100"
                title="Hapus history"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          </a>
        ))}
      </div>

      {/* POPUP KONFIRMASI */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="rk-card w-full max-w-sm rounded-2xl p-5 text-white">
            <h3 className="font-semibold text-lg mb-2">Hapus history?</h3>
            <p className="text-sm text-white/70 mb-4 line-clamp-2">
              ini akan menghapus permanen history {confirm.title}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="rk-btn-ghost flex-1 rounded-xl py-2"
              >
                Batal
              </button>
              <button
                onClick={deleteItem}
                className="flex-1 rounded-xl bg-rose-500 py-2 font-bold transition-colors duration-200 hover:bg-rose-400"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
