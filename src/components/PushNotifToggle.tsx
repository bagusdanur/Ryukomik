"use client";

import { useEffect, useState } from "react";
import { FaBell, FaBellSlash } from "react-icons/fa";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { getExistingSubscription, isPushSupported, subscribePush, unsubscribePush } from "@/utils/pushSubscription";
import { syncBookmarks } from "@/utils/bookmarkSync";
import { RowLeft } from "@/components/setting/settingUi";

export default function PushNotifToggle() {
  const { user } = useSupabaseUser();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSupported(isPushSupported());
    if (isPushSupported()) {
      setPermission(Notification.permission);
      getExistingSubscription().then((sub) => {
        setSubscribed(!!sub);
        setLoading(false);

        // Jika sudah subscribe dan user login, lakukan background sync bookmark
        if (sub && user) {
          syncBookmarks(user.id).catch(console.error);
        }
      });
    } else {
      setLoading(false);
    }
  }, [user]);

  // Sync saat ada event bookmark update
  useEffect(() => {
    if (!subscribed || !user) return;

    const handleBookmarkUpdate = () => {
      syncBookmarks(user.id).catch(console.error);
    };

    const handleBackupRestore = () => {
      // Tunggu localStorage terupdate
      setTimeout(() => syncBookmarks(user.id).catch(console.error), 1000);
    };

    window.addEventListener("bookmark-updated", handleBookmarkUpdate);
    window.addEventListener("rk-auto-sync-backup-finished", handleBackupRestore); // Untuk restore / auto backup

    return () => {
      window.removeEventListener("bookmark-updated", handleBookmarkUpdate);
      window.removeEventListener("rk-auto-sync-backup-finished", handleBackupRestore);
    };
  }, [subscribed, user]);

  const handleToggle = async () => {
    if (!user) {
      alert("Harap login terlebih dahulu untuk mengaktifkan notifikasi.");
      return;
    }
    
    if (permission === "denied") {
      alert("Notifikasi diblokir. Harap izinkan notifikasi di pengaturan browser Anda.");
      return;
    }

    setLoading(true);

    try {
      if (subscribed) {
        const success = await unsubscribePush(user.id);
        if (success) {
          setSubscribed(false);
        } else {
          alert("Gagal mematikan notifikasi.");
        }
      } else {
        const success = await subscribePush(user.id);
        if (success) {
          setSubscribed(true);
          setPermission(Notification.permission);
          // Sync bookmark saat pertama kali subscribe
          await syncBookmarks(user.id);
        } else {
          setPermission(Notification.permission);
          if (Notification.permission !== "granted") {
            alert("Izin notifikasi tidak diberikan.");
          } else {
            alert("Gagal mengaktifkan notifikasi. Pastikan Anda online.");
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="flex w-full items-center justify-between px-4 py-4 opacity-50">
        <RowLeft icon={<FaBellSlash className="text-white/70" />} label="Notifikasi Push" />
        <span className="text-[11px] text-rose-300 font-bold">Tidak Didukung</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading || !user}
      className={`flex w-full items-center justify-between px-4 py-4 text-left transition ${
        loading || !user ? "cursor-wait opacity-70" : "hover:bg-white/[0.06]"
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        {subscribed ? (
          <FaBell className="mt-0.5 shrink-0 text-cyan-200" />
        ) : (
          <FaBellSlash className="mt-0.5 shrink-0 text-white/70" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white/85">Notifikasi Chapter Baru</p>
          <p className="mt-1 text-xs text-white/35">
            Dapatkan notifikasi web saat komik bookmark kamu rilis chapter baru
          </p>
        </div>
      </div>
      
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
          subscribed
            ? "border-cyan-200/35 bg-cyan-200/25"
            : permission === "denied"
              ? "border-rose-500/35 bg-rose-500/25"
              : "border-white/10 bg-white/10"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            subscribed ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}
