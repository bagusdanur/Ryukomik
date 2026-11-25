"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { FiBookOpen, FiCheck, FiCopy, FiRadio } from "react-icons/fi";
import { parseComicPost } from "@/lib/social/comicLink";
import { buildCanonicalUrl, copyTextToClipboard } from "@/utils/shareLink";
import { thumbUrl } from "@/lib/anime/thumb";

/**
 * Kartu kompak untuk postingan yang menautkan komik/chapter Ryukomik
 * (hasil tombol "Bahas komik" di halaman detail). Menggantikan teks URL
 * mentah + gambar berukuran penuh: thumbnail, judul, opini, tombol Baca,
 * dan tombol ikon Salin Link di sampingnya.
 */
export default function ComicLinkCard({
  content,
  imageUrl,
}: {
  content: string;
  imageUrl?: string | null;
}) {
  const comic = parseComicPost(content);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!comic) return null;

  async function handleCopyLink(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!comic) return;
    const ok = await copyTextToClipboard(buildCanonicalUrl(comic.href));
    if (!ok) return;
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 1800);
  }

  const isNobar = comic.kind === "nobar";
  const resolvedImage = imageUrl ? (isNobar ? thumbUrl(imageUrl) || imageUrl : imageUrl) : null;

  return (
    <div
      className={`mt-3 flex gap-3 rounded-2xl border p-2.5 transition ${
        isNobar
          ? "border-rose-400/20 bg-rose-500/[0.04] hover:border-rose-400/35 hover:bg-rose-500/[0.07]"
          : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.035]"
      }`}
    >
      <Link href={comic.href} className="relative shrink-0">
        {resolvedImage ? (
          <img
            src={resolvedImage}
            alt={comic.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-24 w-16 rounded-xl border border-white/10 object-cover"
          />
        ) : (
          <div className="grid h-24 w-16 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-white/25">
            {isNobar ? <FiRadio className="text-xl text-rose-300" /> : <FiBookOpen className="text-xl" />}
          </div>
        )}
        {isNobar && (
          <span className="absolute left-1 top-1 flex items-center gap-1 rounded bg-rose-600/90 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">
            <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
            Nobar
          </span>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <Link href={comic.href} className="min-w-0">
          <p className="line-clamp-2 text-sm font-black leading-snug text-white/90 hover:text-white">
            {comic.title}
          </p>
          {comic.note && (
            <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-white/45">
              {comic.note}
            </p>
          )}
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <Link
            href={comic.href}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-black transition hover:opacity-90 active:scale-95 ${
              isNobar ? "bg-rose-500 text-white" : "bg-[var(--accent-2)] text-black"
            }`}
          >
            {isNobar ? (
              <>
                <FiRadio /> Gabung Nobar
              </>
            ) : (
              <>
                <FiBookOpen /> Baca
              </>
            )}
          </Link>
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label={copied ? "Link tersalin" : isNobar ? "Salin link nobar" : "Salin link komik"}
            title={copied ? "Link tersalin" : "Salin link"}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition active:scale-95 ${
              copied
                ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
                : "border-white/15 bg-white/[0.06] text-white/75 hover:border-white/30 hover:bg-white/10 hover:text-white"
            }`}
          >
            {copied ? <FiCheck className="text-xs" /> : <FiCopy className="text-xs" />}
          </button>
        </div>
      </div>
    </div>
  );
}
