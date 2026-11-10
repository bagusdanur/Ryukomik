"use client";

import Link from "next/link";
import { useEffect } from "react";
import { FiBookOpen, FiX } from "react-icons/fi";

export type ReaderChapterItem = { slug: string; title: string };

type Props = {
  open: boolean;
  onClose: () => void;
  chapters: ReaderChapterItem[];
  currentSlug: string;
  source: string;
  mangaId?: string;
};

function chapterHref(source: string, slug: string) {
  return slug.startsWith("chapter/") ? `/${slug}` : `/chapter/${source}/${slug}`;
}

/**
 * Modal daftar chapter di reader. Tombol ini menggantikan tautan langsung ke
 * detail komik: di dalam modal ada daftar chapter + tombol Detail Komik.
 */
export default function ReaderChapterListModal({ open, onClose, chapters, currentSlug, source, mangaId }: Props) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const detailHref = mangaId ? `/komik/${source}/${mangaId}` : "/";
  // Urutkan nomor chapter turun (terbaru di atas), seperti daftar chapter umum.
  const chapterNum = (value: string) => parseFloat((value.match(/(\d+(?:\.\d+)?)/) || [])[1] || "0");
  const sorted = [...chapters].sort((a, b) => chapterNum(b.title) - chapterNum(a.title));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Daftar Chapter"
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12121a] text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-3">
          <h2 className="px-1 text-sm font-black">Daftar Chapter</h2>
          <div className="flex items-center gap-1.5">
            <Link
              href={detailHref}
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <FiBookOpen size={13} />
              Detail Komik
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {sorted.length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-white/40">Daftar chapter belum tersedia.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {sorted.map((chapter) => {
                const active = chapter.slug === currentSlug;
                return (
                  <li key={chapter.slug}>
                    <Link
                      href={chapterHref(source, chapter.slug)}
                      onClick={onClose}
                      className={`flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-bold transition ${
                        active ? "bg-[var(--accent)]/15 text-[var(--accent-2)]" : "text-white/70 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className="min-w-0 truncate">{chapter.title}</span>
                      {active && <span className="shrink-0 text-[10px] font-black tracking-wide">SEKARANG</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
