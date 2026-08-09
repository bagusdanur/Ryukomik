"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import DownloadButton from "./DownloadButton";
import BatchDownloadButton from "./BatchDownloadButton";
import { FiCheckSquare, FiSquare, FiX, FiSearch } from "react-icons/fi";
import { FiDownload } from "react-icons/fi";
import { RiSortAsc, RiSortDesc } from "react-icons/ri";
import { HiOutlineBookOpen } from "react-icons/hi2";
import PremiumModal from "./PremModal";
import Button from "./Button";
import type { User } from "@supabase/supabase-js";

type ChapterItem = {
  slug?: string;
  title?: string;
  date?: string;
};

type DetailData = {
  chapters?: ChapterItem[];
};

type LastRead = {
  lastChapterSlug?: string;
  displayChapter?: string;
  source?: string;
};

type ChapterListProps = {
  data: DetailData;
  lastRead?: LastRead | null;
  source: string;
  isPremium?: boolean;
  user?: User | null;
};

export default function ChapterList({
  data,
  lastRead,
  source,
  isPremium,
  user,
}: ChapterListProps) {
  const [reverse, setReverse] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [batchMode, setBatchMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  const MAX = 5;

  // Tunggu client mount sebelum render bagian yang pakai lastRead
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const filteredChapters = useMemo(() => {
    const chapters = data.chapters || [];
    const filtered = keyword
      ? chapters.filter((c) =>
        c.title?.toLowerCase().includes(keyword.toLowerCase()),
      )
      : chapters;
    const shouldReverse = source === "project" ? !reverse : reverse;
    return shouldReverse ? [...filtered].reverse() : filtered;
  }, [data.chapters, keyword, reverse, source]);

  const toggleSelect = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        if (next.size >= MAX) return prev;
        next.add(slug);
      }
      return next;
    });
  };

  const cancelBatch = () => {
    setBatchMode(false);
    setSelected(new Set<string>());
  };

  const selectedChapters = filteredChapters
    .filter((c): c is ChapterItem & { slug: string } => Boolean(c.slug) && selected.has(c.slug))
    .map((c) => ({ slug: c.slug, label: c.title }));

  // lastRead hanya valid di client
  const clientLastRead = mounted ? lastRead : null;

  return (
    <div className="rk-shell px-4 mt-10">
      {showPremiumModal && (
        <PremiumModal onClose={() => setShowPremiumModal(false)} />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HiOutlineBookOpen size={18} className="text-white/40" />
          <h2 className="text-base font-bold text-white">Chapter List</h2>
          <span className="text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded-full font-medium">
            {data.chapters?.length || 0}
          </span>
        </div>

        {/* Hanya render tombol lanjut setelah mounted (client only) */}
        {mounted && clientLastRead?.lastChapterSlug && (
          <Link
            prefetch={false}
            href={`/chapter/${clientLastRead.source || source}/${clientLastRead.lastChapterSlug}`}
            className="rk-btn-primary rounded-xl px-3 py-1.5 text-xs font-bold"
          >
            Lanjut {clientLastRead.displayChapter}
          </Link>
        )}
      </div>

      {/* ── Controls bar ── */}
      <div className="flex gap-2 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <FiSearch
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
          />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Cari chapter..."
            className="rk-input w-full rounded-2xl pl-9 pr-4 py-2.5 text-sm placeholder:text-white/25"
          />
          {keyword && (
            <button
              onClick={() => setKeyword("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
            >
              <FiX size={13} />
            </button>
          )}
        </div>

        {/* Sort toggle */}
        <Button
          variant="ghost"
          onClick={() => setReverse(!reverse)}
          className="flex items-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs whitespace-nowrap"
        >
          {reverse ? (
            <>
              <RiSortAsc size={15} /> Terlama
            </>
          ) : (
            <>
              <RiSortDesc size={15} /> Terbaru
            </>
          )}
        </Button>

        {/* Batch DL */}
        {!batchMode ? (
          <Button
            variant="ghost"
            onClick={() => {
              if (!user) {
                setShowPremiumModal(true);
                return;
              }

              if (!isPremium) {
                setShowPremiumModal(true);
                return;
              }
              setBatchMode(true);
            }}
            className="flex items-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs"
          >
            <FiDownload size={15} />
            Batch
          </Button>
        ) : (
          <button
            onClick={cancelBatch}
            className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-3 py-2.5 rounded-xl text-xs text-red-400 transition"
          >
            <FiX size={13} />
            Batal
          </button>
        )}
      </div>

      {/* ── Batch sub-bar ── */}
      {batchMode && (
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-cyan-200/20 bg-cyan-400/10 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Dipilih</span>
            <span className="text-xs font-bold text-cyan-200">
              {selected.size}
            </span>
            <span className="text-xs text-white/30">/ {MAX}</span>
          </div>

          {selected.size > 0 ? (
            <BatchDownloadButton
              source={source}
              chapters={selectedChapters}
              isPremium={isPremium}
              user={user}
            />
          ) : (
            <span className="text-xs text-white/30">
              Pilih chapter di bawah
            </span>
          )}
        </div>
      )}
      <div className="mb-3 rounded-2xl border border-violet-300/20 bg-violet-500/10 px-4 py-3">
        <p className="text-xs text-white/80 font-medium flex gap-1">
          <HiOutlineBookOpen size={16} className="text-white/35" /> Semua
          chapter gratis dibaca
        </p>
        <p className="text-[11px] text-white/40 mt-1">
          Fitur download & batch download khusus Premium
        </p>
      </div>
      {/* ── List ── */}
      <div className="max-h-[620px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
        {filteredChapters.map((chap) => {
          // isLastRead hanya dihitung setelah mounted
          const isLastRead =
            mounted &&
            chap.slug === clientLastRead?.lastChapterSlug &&
            (!clientLastRead?.source || clientLastRead.source === source);
          const chapterSlug = chap.slug ?? "";
          const isSelected = selected.has(chapterSlug);
          const isDisabled = batchMode && !isSelected && selected.size >= MAX;

          return (
            <div
              key={chapterSlug || chap.title}
              onClick={() =>
                batchMode && !isDisabled && chapterSlug && toggleSelect(chapterSlug)
              }
              className={`
    group relative flex items-center gap-1.5
    transition-all duration-200
    ${isDisabled ? "opacity-35 cursor-not-allowed" : ""}
  `}
            >
              {/* Checkbox Batch */}
              {batchMode && (
                <div className="pl-1 shrink-0">
                  {isSelected ? (
                    <FiCheckSquare size={18} className="text-[var(--accent-2)]" />
                  ) : (
                    <FiSquare size={18} className="text-white/25" />
                  )}
                </div>
              )}

              {/* BUTTON CHAPTER */}
              <Link
                prefetch={false}
                href={`/chapter/${source}/${chapterSlug}`}
                onClick={(e) => batchMode && e.preventDefault()}
                className={`
      flex-1 min-w-0
      flex items-center justify-between
      rounded-2xl px-3.5 py-2.5
      border transition-all duration-200
      ${isSelected
                    ? "bg-[var(--accent-2)]/10 border-[var(--accent-2)]/30"
                    : isLastRead
                      ? "bg-violet-500/10 border-violet-300/30"
                      : "rk-card-soft hover:bg-white/[0.08] hover:border-cyan-200/20"
                  }
    `}
              >
                {/* Left */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`
            text-[13px] font-medium truncate
            ${isSelected
                          ? "text-[var(--accent-2)]"
                          : isLastRead
                            ? "text-white/70"
                            : "text-white/90"
                        }
          `}
                    >
                      {chap.title}
                    </span>

                    {isLastRead && !batchMode && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--accent)]/15 border border-[rgba(34,211,238,0.35)] text-[#67e8f9] font-medium uppercase tracking-wider">
                        Baca Terakhir
                      </span>
                    )}
                  </div>

                  {chap.date && (
                    <span className="text-[11px] text-white/30 mt-0.5 block">
                      {chap.date}
                    </span>
                  )}
                </div>

                {/* Icon Read */}
                <div
                  className="
        shrink-0 ml-3
        w-8 h-8 rounded-xl
        bg-white/[0.04]
        flex items-center justify-center
        border border-white/[0.07]
      "
                >
                  <HiOutlineBookOpen size={16} className="text-white/35" />
                </div>
              </Link>

              {!batchMode && (
                <div className="shrink-0 self-stretch w-10">
                  <DownloadButton
                    slug={chapterSlug}
                    source={source}
                    isPremium={isPremium}
                    user={user}
                    onPremium={() => setShowPremiumModal(true)}
                  />
                </div>
              )}
            </div>
          );
        })}

        {filteredChapters.length === 0 && (
          <div className="rk-state rounded-2xl py-12 text-center">
            <p className="text-sm">Chapter tidak ditemukan</p>
          </div>
        )}
      </div>
    </div>
  );
}
