"use client";

import { useEffect, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
type BookmarkItem = {
  slug: string;
  source?: string;
  title?: string;
  image?: string;
};

type FavoriteTabProps = {
  search?: string;
};

export default function FavoriteTab({ search = "" }: FavoriteTabProps) {
  const [data, setData] = useState<BookmarkItem[]>([]);

  const normalizeBookmark = (item: BookmarkItem): BookmarkItem => {
  if (item.source) {
    return {
      ...item,
      source: item.source === "doujindesu" ? "sekte" : item.source,
    };
  }

  return {
    ...item,
    source: "komiku", // default untuk data lama
  };
};

useEffect(() => {
  if (typeof window !== "undefined") {
    const saved = JSON.parse(localStorage.getItem("bookmarks") ?? "[]");

    const normalized = Array.isArray(saved) ? saved.map(normalizeBookmark) : [];

    const id = requestAnimationFrame(() => setData(normalized));

    // 🔥 simpan ulang biar keupdate permanen
    localStorage.setItem("bookmarks", JSON.stringify(normalized));
    return () => cancelAnimationFrame(id);
  }
}, []);

  const handleRemove = (slug: string) => {
    const updated = data.filter((i) => i.slug !== slug);
    setData(updated);
    localStorage.setItem("bookmarks", JSON.stringify(updated));
  };

  const filtered = [...data]
  .filter((item) =>
    (item.title ?? "").toLowerCase().includes(search.toLowerCase())
  )
  .reverse();

  if (filtered.length === 0) {
    return <p className="rk-card-soft rounded-2xl py-10 text-center text-white/60">Tidak ada bookmark</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
      {filtered.map((item) => (
        <div key={item.slug} className="relative group">
          {/* HAPUS */}
          <button
            onClick={() => handleRemove(item.slug)}
            className="absolute left-2 top-2 z-10 rounded-full bg-rose-500/90 p-2 text-xs text-white"
          >
            <FiTrash2 />
          </button>

         <a href={`/komik/${item.source}/${item.slug}`}>
            <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]">
              <img referrerPolicy="no-referrer" src={item.image} className="h-full w-full object-cover" alt={item.title ?? "Bookmark"} />
            </div>
            <p className="mt-2 text-sm font-bold leading-snug text-white/90 line-clamp-2 group-hover:text-cyan-100">{item.title}</p>
          </a>
        </div>
      ))}
    </div>
  );
}
