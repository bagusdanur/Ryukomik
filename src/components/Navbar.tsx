"use client";
import NotificationDropdown from "@/components/terbaru/NotificationDropdown";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState, useEffect, startTransition } from "react";
import type { FormEvent } from "react";
import type { NotificationItem, SourceId } from "@/types/content";
import { supabase } from "@/lib/supabaseClient";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import LoginModal from "@/components/LoginModal";
import AgeModal from "@/components/AgeModal";
import {
  TITLE_RUSH_EVENT_TYPE,
} from "@/utils/titleRushNotification";
import { clearNotificationCache, fetchCachedNotifications } from "@/utils/notificationFetch";

import {
  FaUserCircle,
  FaBell,
  FaExchangeAlt,
  FaCheckCircle,
  FaGlobeAsia,
} from "react-icons/fa"; // Tambah FaBell
import { FiSearch } from "react-icons/fi";

type SourceKey = SourceId;

export default function Navbar() {
  const { user } = useSupabaseUser();
  const [showLogin, setShowLogin] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { avatarUrl, displayName } = useUserProfile(user);
  const userId = user?.id || null;
  const [source, setSource] = useState<SourceKey>("komiku");

  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    const syncSource = () => {
      const saved = localStorage.getItem("source");
      startTransition(() => {
        setSource((saved as SourceKey | null) || "komiku");
      });
    };

    syncSource();

    if (typeof window !== "undefined") {
      const savedAdult = localStorage.getItem("isAdult");
      if (savedAdult === "true") {
        startTransition(() => {
          setIsAdult(true);
        });
      }
    }

    window.addEventListener("sourceChange", syncSource);

    return () => {
      window.removeEventListener("sourceChange", syncSource);
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("source");
    const normalized = (saved as SourceKey | null) || "komiku";
    const id = requestAnimationFrame(() => {
      startTransition(() => {
        setSource(normalized);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const nextNotifications = await fetchCachedNotifications(userId);
    setNotifications(nextNotifications);
    setUnreadCount(nextNotifications.filter((n) => !n.is_read).length || 0);
  }, [userId]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);
    return () => window.clearTimeout(id);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void fetchNotifications();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (tab: "notif" | "info" = "notif") => {
    if (unreadCount === 0 || !user?.id) return;

    if (tab === "info") {
      setNotifications((prev) => {
        const next = prev.map((notification) =>
          notification.type === TITLE_RUSH_EVENT_TYPE
            ? { ...notification, is_read: true }
            : notification,
        );
        setUnreadCount(next.filter((notification) => !notification.is_read).length);
        return next;
      });
      return;
    }

    const unreadRegularIds = notifications
      .filter(
        (notification) =>
          !notification.is_read &&
          notification.type !== TITLE_RUSH_EVENT_TYPE &&
          !String(notification.id).startsWith("title-rush-event-"),
      )
      .map((notification) => notification.id);

    if (!unreadRegularIds.length) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .in("id", unreadRegularIds);

    clearNotificationCache(user.id);
    setNotifications((prev) => {
      const readIds = new Set(unreadRegularIds);
      const next = prev.map((notification) =>
        readIds.has(notification.id) ? { ...notification, is_read: true } : notification,
      );
      setUnreadCount(next.filter((notification) => !notification.is_read).length);
      return next;
    });
  }, [notifications, unreadCount, user]);

  const changeSource = (newSource: SourceKey) => {
    localStorage.setItem("source", newSource);
    startTransition(() => {
      setSource(newSource);
    });

    window.dispatchEvent(new Event("sourceChange"));
  };

  const sourceMap: Record<SourceKey, string> = {
    komiku: "1",
    komikid: "2",
    kiryuu: "2 (Legacy)",
    luvyaa: "3",
    sekte: "4",
    doujindesu: "5",
    meionovels: "Novel",
  };

  const sourceId = sourceMap[source] || "0";

  const detectSource = (slug = ""): { source: SourceKey; slug: string } => {
    if (!slug || typeof slug !== "string") {
      return { source: "komiku", slug: "" };
    }

    const map: SourceKey[] = ["kiryuu", "komikid", "komiku", "luvyaa", "sekte", "doujindesu"];

    for (const s of map) {
      const prefix = `${s}-`;

      if (slug.startsWith(prefix)) {
        return {
          source: s,
          slug: slug.replace(prefix, ""),
        };
      }
    }

    const adultPrefix = ["doujindesu-", "sektedoujin-"].find((prefix) =>
      slug.startsWith(prefix),
    );
    if (adultPrefix) {
      return {
        source: adultPrefix === "doujindesu-" ? "doujindesu" : "sekte",
        slug: slug.replace(adultPrefix, ""),
      };
    }

    // 🔥 DEFAULT (data lama tanpa prefix)
    return {
      source: "komiku",
      slug,
    };
  };

  const [showAgeModal, setShowAgeModal] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [targetSource, setTargetSource] = useState<SourceKey | null>(null);

  const handleAgeConfirm = () => {
    localStorage.setItem("isAdult", "true");
    startTransition(() => {
      setIsAdult(true);
      setShowAgeModal(false);
    });

    // 🔥 LANGSUNG CEK LOGIN
    if (!user) {
      startTransition(() => {
        setShowLogin(true);
      });
      return;
    }

    // 🔥 kalau sudah login langsung masuk
    if (targetSource) {
      changeSource(targetSource);
      startTransition(() => {
        setTargetSource(null);
      });
    }
  };

useEffect(() => {
  if (user && targetSource) {
    const id = requestAnimationFrame(() => {
      changeSource(targetSource);
      setTargetSource(null);
    });
    return () => cancelAnimationFrame(id);
  }
}, [user, targetSource]);

  // 🔥 TAMBAH INI
  const getNotifLink = (n: NotificationItem) => {
    if (!n?.slug) return "#";

    const { source, slug } = detectSource(n.slug);

    if (slug.includes("chapter")) {
      return `/chapter/${source}/${slug}`;
    }

    return `/komik/${source}/${slug}`;
  };

  if (
    pathname.startsWith("/chapter") ||
    pathname.startsWith("/list-komik") ||
    pathname.startsWith("/files") ||
    pathname.startsWith("/game") ||
    pathname.startsWith("/apk") ||
    pathname.startsWith("/terbaru") ||
    pathname.startsWith("/novel/chapter") ||
    pathname.startsWith("/anime") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/topup")
  )
    return null;

  return (
    <>
      {showAgeModal && (
        <AgeModal
          onConfirm={handleAgeConfirm}
          onClose={() => setShowAgeModal(false)}
        />
      )}
      <nav className="rk-topbar fixed top-0 left-0 w-full z-50">
        <div className="max-w-screen-xl mx-auto px-3 py-2.5 flex items-center gap-3">
          {/* SEARCH */}
          <form
          
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const form = e.currentTarget;
              const input = form.elements.namedItem("search") as HTMLInputElement | null;
              const q = input?.value.trim();
              if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
            }}
            className="rk-input flex h-10 min-w-0 flex-1 items-center gap-2 rounded-2xl px-3"
          >
            <FiSearch className="text-cyan-200/70 shrink-0" />
            <input
              name="search"
              type="text"
              placeholder="Cari komik..."
             
              className="bg-transparent outline-none text-sm text-white placeholder-white/45 flex-1 min-w-0"
            />
          </form>

          {showSource && (
            <div className="absolute top-14 right-12 mt-2 w-44 rk-card overflow-hidden rounded-2xl z-50">
              {/* KOMIKU */}
              <button
                onClick={() => changeSource("komiku")}
                className={`flex items-center justify-between w-full px-4 py-2.5 text-sm
                  ${
                    source === "komiku"
                      ? "bg-[var(--accent-2)]/10 text-[var(--accent-2)]"
                      : "text-white/75 hover:bg-white/[0.06]"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <FaGlobeAsia className="text-xs" />
                  <span>Source 1</span>
                </div>

                {source === "komiku" && (
                  <FaCheckCircle className="text-[var(--accent-2)] text-xs" />
                )}
              </button>

              {/* KOMIKID */}
              <button
                onClick={() => changeSource("komikid")}
                className={`flex items-center justify-between w-full px-4 py-2.5 text-sm
                  ${
                    source === "komikid"
                      ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "text-white/75 hover:bg-white/[0.06]"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <FaGlobeAsia className="text-xs" />
                  <span>Source 2</span>
                </div>

                {source === "komikid" && (
                  <FaCheckCircle className="text-violet-300 text-xs" />
                )}
              </button>
              {/* luvyaa */}
              <button
                onClick={() => changeSource("luvyaa")}
                className={`flex items-center justify-between w-full px-4 py-2.5 text-sm
                  ${
                    source === "luvyaa"
                      ? "bg-[var(--accent-2)]/10 text-[var(--accent-2)]"
                      : "text-white/75 hover:bg-white/[0.06]"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <FaGlobeAsia className="text-xs" />
                  <span>Source 3</span>
                </div>

                {source === "luvyaa" && (
                  <FaCheckCircle className="text-[var(--accent-2)] text-xs" />
                )}
              </button>
              {/* sekte */}
              <button
                onClick={() => {
                  if (!isAdult) {
                    setShowAgeModal(true);
                    setTargetSource("sekte");
                    return;
                  }

                  if (!user) {
                    setShowLogin(true);
                    
                    return;
                  }

                  changeSource("sekte");
                  setShowSource(false);
                }}
                className={`flex items-center justify-between w-full px-4 py-2.5 text-sm
        ${
          source === "sekte"
            ? "bg-red-500/10 text-red-400"
            : "text-white/80 hover:bg-white/5"
        }`}
              >
                <div className="flex items-center gap-2">
                  <FaGlobeAsia className="text-xs" />
                  <span>Source 4</span>
                  <span className="text-red-400">18+</span>
                </div>

                {source === "sekte" && (
                  <FaCheckCircle className="text-red-400 text-xs" />
                )}
              </button>

              {/* doujindesu */}
              <button
                onClick={() => {
                  if (!isAdult) {
                    setShowAgeModal(true);
                    setTargetSource("doujindesu");
                    return;
                  }

                  if (!user) {
                    setShowLogin(true);
                    
                    return;
                  }

                  changeSource("doujindesu");
                  setShowSource(false);
                }}
                className={`flex items-center justify-between w-full px-4 py-2.5 text-sm
        ${
          source === "doujindesu"
            ? "bg-red-500/10 text-red-400"
            : "text-white/80 hover:bg-white/5"
        }`}
              >
                <div className="flex items-center gap-2">
                  <FaGlobeAsia className="text-xs" />
                  <span>Source 5</span>
                  <span className="text-red-400">18+</span>
                </div>

                {source === "doujindesu" && (
                  <FaCheckCircle className="text-red-400 text-xs" />
                )}
              </button>

              {/* meionovels */}
              <button
                onClick={() => changeSource("meionovels")}
                className={`flex items-center justify-between w-full px-4 py-2.5 text-sm
                  ${
                    source === "meionovels"
                      ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "text-white/75 hover:bg-white/[0.06]"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <FaGlobeAsia className="text-xs" />
                  <span>Novel</span>
                </div>

                {source === "meionovels" && (
                  <FaCheckCircle className="text-violet-300 text-xs" />
                )}
              </button>
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => startTransition(() => setShowSource(!showSource))}
              className="rk-btn-ghost flex h-10 items-center gap-2 rounded-full px-3 text-sm"
            >
              <FaExchangeAlt className="text-xs" />

              {/* 🔥 tampilkan source aktif */}
              <span className="capitalize">{sourceMap[source]}</span>
            </button>
          </div>

          <NotificationDropdown
            user={user}
            notifications={notifications}
            unreadCount={unreadCount}
            showNotif={showNotif}
            setShowNotif={setShowNotif}
            markAsRead={markAsRead}
            refreshNotifications={fetchNotifications}
          />

          {/* USER */}
          <div className="shrink-0 flex justify-center items-center">
            {!user ? (
              <button
                onClick={() => startTransition(() => setShowLogin(true))}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
                aria-label="Login"
              >
                <FaUserCircle className="text-white/80 hover:text-cyan-200" size={32} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/setting")}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
                aria-label="Buka setting akun"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    referrerPolicy="no-referrer"
                    className="h-9 w-9 rounded-full border border-white/20 object-cover"
                    alt={displayName}
                  />
                ) : (
                  <FaUserCircle className="text-white/80 hover:text-[var(--accent-2)]" size={32} />
                )}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Overlay untuk menutup notif saat klik di luar */}
      {showNotif && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => startTransition(() => setShowNotif(false))}
        />
      )}

      {showLogin && <LoginModal close={() => setShowLogin(false)} />}
    </>
  );
}
