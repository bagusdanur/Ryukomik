"use client";


import { useEffect, useState } from "react";

type BookmarkItem = {
  slug: string;
  image?: string;
  title?: string;
};

function readBookmarks(): BookmarkItem[] {
  try {
    const saved = localStorage.getItem("bookmarks");
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function BookmarkPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);

  // Load bookmarks safely
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = readBookmarks();
      if (saved.length > 0) {
        const id = requestAnimationFrame(() => setBookmarks(saved));
        return () => cancelAnimationFrame(id);
      }
    }
  }, []);

  const handleRemove = (slug: string) => {
    const updated = bookmarks.filter((b) => b.slug !== slug);
    setBookmarks(updated);
    localStorage.setItem("bookmarks", JSON.stringify(updated));
  };

  const handleClear = () => {
    setBookmarks([]);
    localStorage.removeItem("bookmarks");
  };

  return (
    <div className="rk-page px-4 pb-24 pt-20 text-white md:px-18">
      <div className="rk-shell">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black">Bookmarks</h1>

        {bookmarks.length > 0 && (
          <button
            onClick={handleClear}
            className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold hover:bg-rose-400"
          >
            Hapus Semua
          </button>
        )}
      </div>

      <div className="my-4 h-px bg-white/10" />

      <div className="rk-card-soft mb-6 rounded-2xl p-3 text-sm text-white/70">
        Anda dapat menyimpan daftar judul komik di sini hingga 100. Daftar manga
        disimpan di browser yang dapat Anda gunakan saat ini.
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
        {bookmarks.map((item) => (
          <div key={item.slug} className="relative group">
            <button
              onClick={() => handleRemove(item.slug)}
              className="absolute left-2 top-2 z-10 rounded-full bg-rose-500/90 px-2 py-1 text-xs font-bold opacity-90 group-hover:opacity-100"
            >
              hapus
            </button>

            <a href={`/komik/${item.slug}`}>
              <img
                src={item.image}
                alt={item.title}
                className="aspect-[3/4] w-full rounded-2xl border border-white/[0.08] object-cover"
              />
            </a>

            <p className="mt-2 text-sm font-bold leading-snug text-white/90 line-clamp-2 group-hover:text-cyan-100">
              {item.title}
            </p>
          </div>
        ))}
      </div>

      {bookmarks.length === 0 && (
        <p className="rk-card-soft mt-10 rounded-2xl py-10 text-center text-white/70">Belum ada bookmark...</p>
      )}
      </div>
    </div>
  );
}
