"use client";

import { useEffect, useState } from "react";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { isPushSupported, subscribePush, getExistingSubscription } from "@/utils/pushSubscription";
import { IoMdNotifications, IoMdClose } from "react-icons/io";
import Button from "@/components/Button";

export default function NotificationPrompt() {
  const { user } = useSupabaseUser();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    if (!user) return;
    if (!isPushSupported()) return;
    if (Notification.permission === "denied") return;

    getExistingSubscription().then((sub) => {
      if (sub) {
        setDone(true);
        return;
      }

      const dismissed = localStorage.getItem("notif-prompt-dismissed");
      if (dismissed) {
        const diff = Date.now() - parseInt(dismissed, 10);
        if (diff < 7 * 24 * 60 * 60 * 1000) {
          setDone(true);
          return;
        }
      }

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
    <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm transition-all duration-300 sm:bottom-6">
      <div className="rk-card rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-full p-1 text-[var(--muted-soft)] transition hover:bg-white/10 hover:text-white"
        >
          <IoMdClose size={18} />
        </button>

        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "color-mix(in srgb, var(--accent) 25%, transparent)" }}
          >
            <IoMdNotifications size={22} color="var(--accent)" />
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Aktifkan Notifikasi? 🔔
            </h3>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
              Dapatkan notifikasi <strong>chapter terbaru</strong> dari komik favoritmu,
              <strong> balasan komentar</strong>, dan info <strong>bookmark</strong>!
            </p>

            <div className="mt-3 flex gap-2">
              <Button
                onClick={handleSubscribe}
                disabled={loading}
                className="flex-1 rounded-lg py-2 text-xs font-medium disabled:opacity-50"
                style={{ background: "var(--accent)" }}
              >
                {loading ? "Menyiapkan..." : "Ya, aktifkan! 🔔"}
              </Button>
              <button
                onClick={handleDismiss}
                className="rounded-lg border px-4 py-2 text-xs transition hover:bg-white/5"
                style={{
                  borderColor: "var(--line-soft)",
                  color: "var(--muted)",
                }}
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
