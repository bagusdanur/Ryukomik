"use client";

import { BookOpen } from "lucide-react";

/**
 * Cover kecil untuk daftar riwayat baca.
 *
 * Sengaja memakai <img> biasa (bukan next/image) supaya tidak ada optimizer
 * tambahan: cover sudah berupa URL storage yang di-cache CDN. Kalau thumbnail
 * belum tersedia, tampilkan placeholder supaya tinggi baris tidak melompat.
 */
export default function HistoryThumb({
  thumbnail,
  title,
  className = "",
}: {
  thumbnail?: string | null;
  title?: string | null;
  className?: string;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5 ${className || "h-14 w-10"}`}
    >
      {thumbnail ? (
        <img
          src={thumbnail}
          alt={title ? `Cover ${title}` : "Cover komik"}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/25">
          <BookOpen size={16} />
        </div>
      )}
    </div>
  );
}
