"use client";

import { useEffect, useState } from "react";
import { FaBookmark, FaRegBookmark } from "react-icons/fa";

type BookmarkButtonProps = {
  slug: string;
  title?: string;
  image?: string;
  source?: string;
};

type LocalBookmark = BookmarkButtonProps;

const readBookmarks = (): LocalBookmark[] => {
  try {
    const value = localStorage.getItem("bookmarks");
    return value ? (JSON.parse(value) as LocalBookmark[]) : [];
  } catch {
    return [];
  }
};

export default function BookmarkButton({
  slug,
  title,
  image,
  source,
}: BookmarkButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const list = readBookmarks();

    queueMicrotask(() => {
      setSaved(list.some((item) => item.slug === slug));
    });
  }, [slug]);

  const toggleBookmark = () => {
    let list = readBookmarks();

    if (saved) {
      list = list.filter((item) => item.slug !== slug);
      localStorage.setItem("bookmarks", JSON.stringify(list));
      setSaved(false);
      window.dispatchEvent(new Event("bookmark-updated"));
      return;
    }

    list.push({
      slug,
      title,
      image,
      source: source === "doujindesu" ? "sekte" : source,
    });
    localStorage.setItem("bookmarks", JSON.stringify(list));
    setSaved(true);
    window.dispatchEvent(new Event("bookmark-updated"));
  };

  return (
    <button
      type="button"
      onClick={toggleBookmark}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition active:scale-95 ${
        saved
          ? "border-[var(--accent-2)]/35 bg-[var(--accent-2)]/15 text-[var(--accent-2)] hover:bg-[var(--accent-2)]/20"
          : "border-white/10 bg-white/[0.06] text-white/80 hover:border-[var(--accent-2)]/25 hover:bg-white/10 hover:text-[var(--accent-2)]"
      }`}
      aria-pressed={saved}
    >
      {saved ? <FaBookmark className="text-xs" /> : <FaRegBookmark className="text-xs" />}
      {saved ? "Tersimpan" : "Bookmark"}
    </button>
  );
}
