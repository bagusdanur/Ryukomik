"use client";
import CommentsSupabase from "@/components/CommentsSupabase";
import { useState, useMemo, useCallback } from "react";
import { useHistoryStore } from "@/store/historyStore";
import { useRouter } from "next/navigation";

type NovelChapter = {
  title?: string;
  url?: string;
  date?: string;
};

type NovelDetail = {
  title?: string;
  image?: string;
  alternative?: string;
  author?: string[];
  artist?: string[];
  status?: string;
  type?: string;
  synopsis?: string;
  genres?: string[];
  chapters?: NovelChapter[];
  source?: string;
};

import type { ReadHistoryItem } from "@/types/user";

type NovelDetailClientProps = {
  data: NovelDetail | null;
  slug: string;
};



export default function NovelDetailClient({ data, slug }: NovelDetailClientProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [reverse, setReverse] = useState(false);
  const [expand, setExpand] = useState(false);
  const historyStore = useHistoryStore((state) => state.history);

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

  const lastRead = useMemo<(ReadHistoryItem & { displayChapter?: string }) | null>(() => {
    try {
      const historyItem = historyStore.find((h: ReadHistoryItem) => h.comicSlug === slug);

      if (historyItem) {
        const displayCh = extractChapter(historyItem.lastChapter, historyItem.lastChapterSlug);
        return {
          ...historyItem,
          displayChapter: displayCh,
        };
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }, [slug, extractChapter, historyStore]);

  const filteredChapters = useMemo(() => {
    const chapters = data?.chapters ?? [];
    let list = chapters.filter((c) =>
      (c.title ?? "").toLowerCase().includes(keyword.toLowerCase())
    );
    return reverse ? [...list].reverse() : list;
  }, [data?.chapters, keyword, reverse]);

  const getChapterSlug = (url?: string) => {
    if (!url) return "";
    return url.split("/novel/")[1]?.replace(/\/$/, "");
  };

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center text-white">
      <p>Gagal memuat. <button onClick={() => router.refresh()} className="underline">Coba lagi</button></p>
    </div>
  );

  return (
    <div className="w-full min-h-screen text-white pb-20">
      {/* HERO */}
      <div className="relative h-[280px]">
        <img src={data.image} className="w-full h-full object-cover" alt={data.title} />
        <div className="absolute inset-0 bg-black/60" />
        <button onClick={() => router.back()} className="absolute top-4 left-4 bg-black/60 p-3 rounded-full">←</button>
      </div>

      {/* INFO */}
      <div className="px-4 -mt-16 relative z-10">
        <div className="flex gap-4">
          <img
            src={data.image}
            className="w-28 h-40 rounded-xl object-cover border border-white/10 shadow-lg"
            alt={data.title}
          />
          <div className="flex-1">
            <h1 className="text-xl font-bold">{data.title}</h1>
            <p className="text-sm text-gray-400 mt-1">{data.alternative}</p>
            <div className="mt-2 text-xs space-y-1">
              <p>Author: {(data.author ?? []).join(", ")}</p>
              <p>Artist: {(data.artist ?? []).join(", ")}</p>
              <p>Status: {data.status}</p>
              <p>Type: {data.type}</p>
            </div>
          </div>
        </div>
      </div>

      {/* SINOPSIS */}
      <div className="px-4 mt-6">
        <p className={`text-white/70 text-sm leading-relaxed transition-all ${!expand && "line-clamp-3"}`}>
          {data.synopsis}
        </p>
        <button onClick={() => setExpand(!expand)} className="text-sm text-[#7d5fff] font-medium mt-2">
          {expand ? "Tutup" : "Lihat selengkapnya"}
        </button>
      </div>

      {/* GENRE */}
      <div className="px-4 mt-4 flex gap-2 flex-wrap">
        {data.genres?.map((g, i) => (
          <span key={i} className="bg-white/10 px-3 py-1 rounded-full text-xs">{g}</span>
        ))}
      </div>

      {/* CHAPTER */}
      <div className="px-4 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <h2 className="text-base font-bold whitespace-nowrap">Chapters</h2>
              <span className="bg-[#7d5fff] text-[10px] px-2 py-0.5 rounded-full border">
                {data.chapters?.length ?? 0}
              </span>
            </div>
            {lastRead?.lastChapterSlug && (
              <a
                href={`/novel/chapter/${lastRead.lastChapterSlug}`}
                className="text-[10px] bg-[#7d5fff] hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold transition-colors"
              >
                Lanjut {lastRead.displayChapter}
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari chapter..."
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:border-blue-500/50 outline-none transition-all placeholder:text-white/30"
            />
            <button
              onClick={() => setReverse(!reverse)}
              className="flex items-center gap-1.5 text-[11px] font-medium bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg border border-white/5 transition-colors active:scale-95"
            >
              {reverse ? "Terlama" : "Terbaru"}
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredChapters.map((ch, i) => {
            const chSlug = getChapterSlug(ch.url);
            const isLastRead = chSlug === lastRead?.lastChapterSlug;
            return (
              <div
                key={i}
                onClick={() => router.push(`/novel/chapter/${chSlug}`)}
                className={`flex justify-between items-center rounded-xl p-4 transition border cursor-pointer ${isLastRead ? "border-[#7d5fff]" : "bg-white/5 border-transparent hover:bg-white/10"}`}
              >
                <span className="text-sm">{(ch.title ?? "").replace("Chapter", "Ch.")}</span>
                {isLastRead && (
                  <span className="text-[10px] text-[#7d5fff] uppercase tracking-wider font-bold">
                    Terakhir dibaca
                  </span>
                )}
                <span className="text-xs text-white/50">{ch.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* COMMENT */}
      <div className="px-4 mt-10 border-t border-white/10 pt-10">
        <CommentsSupabase type="komik" slug={`${data.source}-${slug}`} chapter={undefined} />
      </div>
    </div>
  );
}
