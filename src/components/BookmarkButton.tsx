"use client";

import { useEffect, useState } from "react";
import { FaBell, FaBookmark, FaRegBookmark, FaTimes } from "react-icons/fa";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { getExistingSubscription, subscribePush } from "@/utils/pushSubscription";
import { syncBookmarks } from "@/utils/bookmarkSync";
import LoginModal from "@/components/LoginModal";

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
  const [showLogin, setShowLogin] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isPushActive, setIsPushActive] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const { user } = useSupabaseUser();

  useEffect(() => {
    const list = readBookmarks();
    queueMicrotask(() => {
      setSaved(list.some((item) => item.slug === slug));
    });
  }, [slug]);

  // Cek apakah push notification aktif di perangkat ini
  useEffect(() => {
    async function checkSubscription() {
      try {
        const sub = await getExistingSubscription();
        setIsPushActive(!!sub);
      } catch (err) {
        console.error("Gagal mengecek status subscription:", err);
      }
    }
    checkSubscription();
  }, [user]);

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

    // Tampilkan promo notifikasi jika belum berlangganan push notification
    try {
      if (!user) {
        // Jika tidak login, cek sessionStorage untuk sesi ini (Bug 2)
        const isDismissedSession = sessionStorage.getItem("dismissed_push_promo") === "true";
        if (!isDismissedSession) {
          setShowPromo(true); // Bug 1: abaikan cek sub browser jika tidak login
        }
      } else {
        // Jika login, cek sub asli & localStorage
        const isDismissedLocal = localStorage.getItem("dismissed_push_promo") === "true";
        const sub = await getExistingSubscription();
        if (!sub && !isDismissedLocal) {
          setShowPromo(true);
        }
      }
    } catch (err) {
      console.error("Gagal mengecek status notif:", err);
      setShowPromo(true);
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      setShowPromo(false);
      setShowLogin(true);
      return;
    }

    setIsSubscribing(true);
    try {
      const success = await subscribePush(user.id);
      if (success) {
        await syncBookmarks(user.id);
        setShowPromo(false);
        setIsPushActive(true);
        setNotification({
          type: "success",
          title: "Notifikasi Aktif!",
          message: "Kamu akan otomatis menerima notifikasi setiap ada chapter terbaru rilis.",
        });
      } else {
        setNotification({
          type: "error",
          title: "Gagal Mengaktifkan",
          message: "Gagal mengaktifkan notifikasi. Silakan periksa pengaturan izin notifikasi browser Anda.",
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        title: "Terjadi Kesalahan",
        message: "Terjadi kesalahan sistem saat mengaktifkan notifikasi.",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const dismissPromo = () => {
    if (user) {
      localStorage.setItem("dismissed_push_promo", "true");
    } else {
      sessionStorage.setItem("dismissed_push_promo", "true");
    }
    setShowPromo(false);
  };

  return (
    <>
      <div className="flex items-center gap-2">
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

        {/* Tombol bel pulsing/statis jika komik sudah tersimpan (Bug 3) */}
        {saved && (
          <button
            type="button"
            onClick={() => setShowPromo(true)}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition active:scale-95 ${
              isPushActive
                ? "border-white/10 bg-white/[0.04] text-white/40 hover:text-white"
                : "border-[var(--accent-2)]/30 bg-[var(--accent-2)]/10 text-[var(--accent-2)] hover:bg-[var(--accent-2)]/20 animate-pulse"
            }`}
            title={isPushActive ? "Notifikasi Aktif" : "Aktifkan Notifikasi Rilis"}
            disabled={isPushActive}
          >
            <FaBell className="text-xs" />
          </button>
        )}
      </div>

      {/* Pop-up Promo Notifikasi */}
      {showPromo && (
        <>
          {/* Backdrop untuk promo modal agar fokus */}
          <div 
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={dismissPromo}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[92%] max-w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[var(--accent-2)]/20 bg-[var(--surface-1)] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={dismissPromo}
              className="absolute right-4 top-4 text-white/40 hover:text-white transition-colors"
            >
              <FaTimes />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-2)]/10 text-[var(--accent-2)] shadow-inner mb-4">
                <FaBell className="text-2xl animate-bounce" />
              </div>
              <h4 className="text-lg font-black text-white">Nyala Notifikasi?</h4>
              <p className="mt-2 text-sm text-white/60 leading-relaxed">
                {user 
                  ? "Dapatkan notifikasi instan langsung di perangkat kamu setiap kali chapter terbaru komik ini dirilis!"
                  : "Login untuk mengaktifkan notifikasi instan di perangkat kamu setiap kali chapter terbaru rilis!"}
              </p>
              
              <div className="mt-6 flex w-full flex-col gap-2">
                <button
                  onClick={handleSubscribe}
                  disabled={isSubscribing}
                  className="w-full rounded-xl bg-[var(--accent-2)] py-3 text-sm font-bold text-black transition active:scale-95 disabled:opacity-50 hover:brightness-110"
                >
                  {isSubscribing ? "Menghubungkan..." : user ? "Ya, Aktifkan!" : "Login & Aktifkan"}
                </button>
                <button
                  onClick={dismissPromo}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 active:scale-95"
                >
                  Nanti Saja
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Custom Notifikasi (Sukses / Gagal) */}
      {notification && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs animate-in fade-in"
            onClick={() => setNotification(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[92%] max-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-[var(--surface-1)] p-6 shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
              notification.type === "success" 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}>
              {notification.type === "success" ? (
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <h3 className="text-lg font-black text-white">{notification.title}</h3>
            <p className="mt-2 text-sm text-white/60 leading-relaxed">{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="mt-6 w-full rounded-xl bg-white/10 py-3 text-sm font-bold text-white transition hover:bg-white/15 active:scale-95"
            >
              Mengerti
            </button>
          </div>
        </>
      )}

      {/* Render LoginModal if needed */}
      {showLogin && <LoginModal close={() => setShowLogin(false)} />}
    </>
  );
}
