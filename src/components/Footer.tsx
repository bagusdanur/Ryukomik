"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FiClock, FiHome, FiSettings, FiUsers } from "react-icons/fi";
import { TbPlayerSkipForward } from "react-icons/tb";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { supabase } from "@/lib/supabaseClient";

const BADGE_POLL_MS = 90_000;

/**
 * Angka kecil di tombol Komunitas = jumlah notifikasi belum dibaca.
 *
 * Memakai endpoint ringan (/api/social/notifications/unread, satu COUNT) supaya
 * polling badge tidak ikut menarik 20 baris notifikasi di setiap halaman.
 * Refetch saat pindah halaman, saat tab kembali aktif, dan setelah notifikasi
 * ditandai dibaca (event "rk-notifications-read").
 */
function useUnreadCount() {
  const { user } = useSupabaseUser();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setCount(0);
      return;
    }
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/social/notifications/unread", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const payload = (await res.json()) as { count?: number };
      setCount(Math.max(0, Number(payload.count) || 0));
    } catch {
      // badge bersifat pelengkap — jangan ganggu navigasi
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setCount(0);
      return;
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, BADGE_POLL_MS);
    window.addEventListener("rk-notifications-read", refresh);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("rk-notifications-read", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user?.id, refresh]);

  return count;
}

export default function BottomNav() {
  const path = usePathname();
  const unread = useUnreadCount();

  if (
    path.startsWith("/chapter") ||
    path.startsWith("/novel/chapter") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/game") ||
    path.startsWith("/apk") ||
    path.startsWith("/topup")
  ) {
    return null;
  }

  const menu = [
    { href: "/", icon: FiHome, label: "Home" },
    { href: "/anime/terbaru", icon: TbPlayerSkipForward, label: "Anime" },
    { href: "/terbaru", icon: FiClock, label: "Terbaru" },
    { href: "/files", icon: FiUsers, label: "Komunitas" },
    { href: "/setting", icon: FiSettings, label: "Setting" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-white/[0.08] bg-[var(--background)]">
      <div className="pb-safe mx-auto flex max-w-screen-sm justify-around px-2 pt-2">
        {menu.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          const showBadge = item.href === "/files" && unread > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              rel="nofollow"
              className={`flex min-w-14 flex-col items-center gap-0.5 px-2 py-1.5 text-[11px] font-medium transition ${
                active
                  ? "text-[var(--accent-2)]"
                  : "text-white/50 hover:text-white/80"
              }`}
              aria-label={
                showBadge
                  ? `${item.label} (${unread} notifikasi baru)`
                  : item.label
              }
            >
              <span className="relative inline-flex">
                <Icon size={22} />
                {showBadge && (
                  <span className="absolute -right-2 -top-1.5 min-w-[15px] rounded-full bg-rose-500 px-1 text-center text-[9px] font-black leading-[15px] text-white shadow-[0_0_0_2px_var(--background)]">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
