"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { FiBookOpen, FiCheck, FiCopy } from "react-icons/fi";
import { parseComicPost } from "@/lib/social/comicLink";
import { buildCanonicalUrl, copyTextToClipboard } from "@/utils/shareLink";

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

  return (
    <div className="mt-3 flex gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-2.5 transition hover:border-white/20 hover:bg-white/[0.035]">
      <Link href={comic.href} className="shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={comic.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-24 w-16 rounded-xl border border-white/10 object-cover"
          />
        ) : (
          <div className="grid h-24 w-16 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-white/25">
            <FiBookOpen className="text-xl" />
          </div>
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
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-2)] px-3.5 py-1.5 text-[11px] font-black text-black transition hover:opacity-90 active:scale-95"
          >
            <FiBookOpen /> Baca
          </Link>
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label={copied ? "Link tersalin" : "Salin link komik"}
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
