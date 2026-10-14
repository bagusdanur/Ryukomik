"use client";

import Link from "next/link";
import { FiBookOpen } from "react-icons/fi";
import { parseComicPost } from "@/lib/social/comicLink";

/**
 * Kartu kompak untuk postingan yang menautkan komik/chapter Ryukomik
 * (hasil tombol "Bahas komik" di halaman detail). Menggantikan teks URL
 * mentah + gambar berukuran penuh: cukup thumbnail kecil, judul, opini,
 * dan tombol Baca.
 */
export default function ComicLinkCard({
  content,
  imageUrl,
}: {
  content: string;
  imageUrl?: string | null;
}) {
  const comic = parseComicPost(content);
  if (!comic) return null;

  return (
    <div className="mt-3 flex gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-2.5 transition hover:border-white/20 hover:bg-white/[0.035]">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-24 w-16 shrink-0 rounded-xl border border-white/10 object-cover"
        />
      ) : (
        <div className="grid h-24 w-16 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-white/25">
          <FiBookOpen className="text-xl" />
        </div>
      )}
      <Link href={comic.href} className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-black leading-snug text-white/90">
          {comic.title}
        </p>
        {comic.note && (
          <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-white/45">
            {comic.note}
          </p>
        )}
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-2)] px-3 py-1.5 text-[11px] font-black text-black">
          <FiBookOpen /> Baca
        </span>
      </Link>
    </div>
  );
}
