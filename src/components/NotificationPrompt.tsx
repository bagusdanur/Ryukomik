"use client";

import { useEffect, useState } from "react";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { isPushSupported, subscribePush, getExistingSubscription } from "@/utils/pushSubscription";
import { IoMdNotifications, IoMdClose } from "react-icons/io";

export default function NotificationPrompt() {
  const { user } = useSupabaseUser();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    if (!user) return; // Tunggu login dulu
    if (!isPushSupported()) return;
    if (Notification.permission === "denied") return; // Udah pernah ditolak

    // Cek apakah user udah punya subscription
    getExistingSubscription().then((sub) => {
      if (sub) {
        setDone(true);
        return;
      }

      // Cek localStorage biar gak muncul terus kalau pernah ditutup
      const dismissed = localStorage.getItem("notif-prompt-dismissed");
      if (dismissed) {
        // Tampilkan lagi setelah 7 hari
        const diff = Date.now() - parseInt(dismissed, 10);
        if (diff < 7 * 24 * 60 * 60 * 1000) {
          setDone(true);
          return;
        }
      }

      // Munculin setelah 3 detik biar user lihat dulu websitenya
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    });
  }, [user, done]);

  const handleSubscribe = async () => {
    if (!user) return;
    setLoading(true);
    const ok = await subscribePush(user.id);
    setLoading(false);
    if (ok) {
      setShow(false);
      setDone(true);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("notif-prompt-dismissed", String(Date.now()));
    setDone(true);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm animate-slide-up">
      <div className="relative rounded-2xl border border-white/10 bg-[var(--surface-2)] p-4 shadow-2xl backdrop-blur-xl">
        {/* Tombol tutup */}
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-full p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <IoMdClose size={18} />
        </button>

        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
            <IoMdNotifications size={22} />
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">
              Aktifkan Notifikasi? 🔔
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-white/60">
              Dapatkan notifikasi <strong>chapter terbaru</strong> dari komik favoritmu,
              <strong> balasan komentar</strong>, dan info <strong>bookmark</strong> lainnya!
            </p>

            <div className="mt-3 flex gap-2">
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? "Menyiapkan..." : "Ya, aktifkan! 🔔"}
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/50 transition hover:bg-white/5 hover:text-white/80"
              >
                Nanti saja
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
