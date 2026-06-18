"use client";

import { useEffect, useState } from "react";
import { FaBell, FaBookmark, FaRegBookmark, FaTimes } from "react-icons/fa";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { getExistingSubscription, subscribePush } from "@/utils/pushSubscription";
import { syncBookmarks } from "@/utils/bookmarkSync";

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
  const [showPromo, setShowPromo] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { user } = useSupabaseUser();

  useEffect(() => {
    const list = readBookmarks();
    queueMicrotask(() => {
      setSaved(list.some((item) => item.slug === slug));
    });
  }, [slug]);

  const toggleBookmark = async () => {
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

    // Tampilkan promo notifikasi jika user login dan belum langganan
    if (user && localStorage.getItem("dismissed_push_promo") !== "true") {
      const sub = await getExistingSubscription();
      if (!sub) {
        setShowPromo(true);
      }
    }
  };

  const handleSubscribe = async () => {
    if (!user) return;
    setIsSubscribing(true);
    const success = await subscribePush(user.id);
    if (success) {
      await syncBookmarks(user.id);
      setShowPromo(false);
      alert("Notifikasi berhasil diaktifkan!");
    } else {
      alert("Gagal mengaktifkan notifikasi. Pastikan izin tidak diblokir browser.");
    }
    setIsSubscribing(false);
  };

  const dismissPromo = () => {
    localStorage.setItem("dismissed_push_promo", "true");
    setShowPromo(false);
  };

  return (
    <>
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

      {/* Pop-up Promo Notifikasi */}
      {showPromo && (
        <div className="fixed bottom-24 left-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 animate-in slide-in-from-bottom-8 fade-in rounded-2xl border border-[var(--accent-2)]/30 bg-[#161618] p-5 shadow-2xl">
          <button
            onClick={dismissPromo}
            className="absolute right-3 top-3 text-white/40 hover:text-white"
          >
            <FaTimes />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-2)]/20 text-[var(--accent-2)]">
              <FaBell className="text-lg" />
            </div>
            <div>
              <h4 className="font-bold text-white">Nyala Notifikasi?</h4>
              <p className="mt-1 text-xs text-white/70 leading-relaxed">
                Mau dapet pesan otomatis di HP kamu kalau chapter selanjutnya rilis?
              </p>
              
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleSubscribe}
                  disabled={isSubscribing}
                  className="flex-1 rounded-lg bg-[var(--accent-2)] py-2 text-xs font-bold text-black transition active:scale-95 disabled:opacity-50"
                >
                  {isSubscribing ? "Tunggu..." : "Mau!"}
                </button>
                <button
                  onClick={dismissPromo}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 active:scale-95"
                >
                  Nanti Saja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
