"use client";

import Link from "next/link";
import { FaBell, FaGamepad } from "react-icons/fa";
import { RiVipCrownLine } from "react-icons/ri";
import { FiArrowRight, FiAward, FiCheckCircle, FiMessageCircle } from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { useEffect, useMemo, useState, startTransition, type Dispatch, type SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import type { NotificationItem, SourceId } from "@/types/content";
import {
  markTitleRushWeeklyNotificationRead,
  TITLE_RUSH_EVENT_TYPE,
} from "@/utils/titleRushNotification";

interface NotificationDropdownProps {
  user: User | null;
  notifications: NotificationItem[];
  unreadCount: number;
  showNotif: boolean;
  setShowNotif: Dispatch<SetStateAction<boolean>>;
  markAsRead: (tab?: "notif" | "info") => Promise<void>;
  refreshNotifications?: () => Promise<void>;
}

interface FormattedNotificationItem extends NotificationItem {
  formattedTime: string;
}

export default function NotificationDropdown({
  user,
  notifications,
  unreadCount,
  showNotif,
  setShowNotif,
  markAsRead,
  refreshNotifications,
}: NotificationDropdownProps) {
  const [activeTab, setActiveTab] = useState<"notif" | "info">("notif");

  const formattedNotifications = useMemo<FormattedNotificationItem[]>(() => {
    return notifications.map((notification) => {
      let formattedTime = "";
      try {
        formattedTime = formatDistanceToNow(new Date(notification.created_at), {
          addSuffix: true,
          locale: id,
        });
      } catch (e) {
        formattedTime = "";
      }
      return {
        ...notification,
        formattedTime,
      };
    });
  }, [notifications]);

  const infoNotifications = useMemo(
    () => formattedNotifications.filter((notification) => notification.type === TITLE_RUSH_EVENT_TYPE),
    [formattedNotifications],
  );
  const regularNotifications = useMemo(
    () => formattedNotifications.filter((notification) => notification.type !== TITLE_RUSH_EVENT_TYPE),
    [formattedNotifications],
  );
  const infoUnreadCount = infoNotifications.filter((notification) => !notification.is_read).length;
  const regularUnreadCount = regularNotifications.filter((notification) => !notification.is_read).length;
  const activeNotifications = activeTab === "info" ? infoNotifications : regularNotifications;

  useEffect(() => {
    if (!showNotif || !user?.id) return;

    if (activeTab === "info") {
      const eventNotification = infoNotifications.find(
        (notification) => !notification.is_read && notification.type === TITLE_RUSH_EVENT_TYPE,
      );
      if (eventNotification) {
        markTitleRushWeeklyNotificationRead(user.id, eventNotification.slug);
      }
    }

    if (activeTab === "info" ? infoUnreadCount > 0 : regularUnreadCount > 0) {
      void markAsRead(activeTab);
    }
  }, [
    activeTab,
    infoNotifications,
    infoUnreadCount,
    markAsRead,
    regularUnreadCount,
    showNotif,
    user?.id,
  ]);

  if (!user) return null;

  const detectSource = (slug = ""): { source: SourceId; slug: string } => {
    if (!slug || typeof slug !== "string") return { source: "komiku", slug: "" };
    const map: SourceId[] = ["kiryuu", "komiku", "sekte", "doujindesu"];

    for (const source of map) {
      const prefix = `${source}-`;
      if (slug.startsWith(prefix)) {
        return { source, slug: slug.replace(prefix, "") };
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

    return { source: "komiku", slug };
  };

  const getNotifLink = (notification: NotificationItem) => {
    if (
      notification?.type === TITLE_RUSH_EVENT_TYPE ||
      notification?.type === "premium_activated" ||
      notification?.type === "premium_reward"
    ) {
      if (notification?.type === TITLE_RUSH_EVENT_TYPE) return "/game";
      return "/premium-pay";
    }
    if (!notification?.slug) return "#";

    const { source, slug } = detectSource(notification.slug);
    const isChapter =
      slug.includes("/chapter-") ||
      slug.includes("-chapter-") ||
      slug.includes("volume");

    if (source === "meionovels") {
      return isChapter ? `/novel/chapter/${slug}` : `/novel/${slug}`;
    }

    if (isChapter) return `/chapter/${source}/${slug}`;
    return `/komik/${source}/${slug}`;
  };

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => {
          startTransition(() => {
            setShowNotif(!showNotif);
          });
          if (!showNotif) {
            void refreshNotifications?.();
          }
        }}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
        aria-label="Buka notifikasi"
      >
        <FaBell
          className={unreadCount > 0 ? "text-[var(--accent-2)]" : "text-white/70"}
          size={18}
        />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-[var(--surface-0)] bg-[var(--accent-3)] text-[9px] font-black text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {showNotif && (
        <div className="fixed left-1/2 top-14 z-50 w-[min(18rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--surface-1)] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:translate-x-0">
          <div className="flex items-center justify-between border-b border-[var(--line-soft)] p-3">
            <span className="text-[12px] font-bold text-white">Notifikasi</span>
            <span className="text-[10px] uppercase text-white/35">Terbaru</span>
          </div>

          <div className="grid grid-cols-2 gap-1 border-b border-[var(--line-soft)] p-2">
            {[
              { key: "notif" as const, label: "Notif", count: regularUnreadCount },
              { key: "info" as const, label: "Info", count: infoUnreadCount },
            ].map((tab) => {
              const active = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => startTransition(() => setActiveTab(tab.key))}
                  className={`flex h-8 items-center justify-center gap-1.5 rounded-lg text-[11px] font-black transition ${
                    active
                      ? "border border-[color:color-mix(in_srgb,var(--accent)_78%,white)] bg-[var(--accent)] text-white shadow-[inset_0_1px_0_color-mix(in_srgb,white_22%,transparent)]"
                      : "border border-[var(--line-soft)] bg-[color:color-mix(in_srgb,var(--surface-2)_82%,var(--surface-1))] text-white/78 hover:border-[color:color-mix(in_srgb,var(--accent-2)_24%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--accent)_14%,var(--surface-2))] hover:text-white"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] ${
                        active
                          ? "bg-[var(--accent-2)] text-[var(--surface-0)]"
                          : "bg-[color:color-mix(in_srgb,var(--accent-2)_14%,transparent)] text-[var(--accent-2)]"
                      }`}
                    >
                      <FaBell size={8} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {activeNotifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-white/35">
                {activeTab === "info" ? "Belum ada info." : "Belum ada notifikasi."}
              </div>
            ) : (
              activeNotifications.map((notification) =>
                notification.type === TITLE_RUSH_EVENT_TYPE ? (
                  <Link
                    prefetch={false}
                    key={notification.id}
                    href="/game"
                    onClick={() => {
                      markTitleRushWeeklyNotificationRead(user.id, notification.slug);
                      setShowNotif(false);
                    }}
                    className="block border-b border-[var(--line-soft)] bg-[color:color-mix(in_srgb,var(--accent-2)_8%,transparent)] p-2.5 transition-colors hover:bg-[color:color-mix(in_srgb,var(--accent-2)_12%,transparent)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:color-mix(in_srgb,var(--accent-2)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--accent-2)_12%,transparent)]">
                          <FaGamepad size={15} className="text-[var(--accent-2)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-black text-white">
                            Event Mingguan
                          </p>
                          <p className="truncate text-[9px] font-bold uppercase tracking-wide text-[var(--accent-2)]">
                            Title Rush sudah dimulai
                          </p>
                        </div>
                      </div>
                      <FiAward
                        className="shrink-0 text-[var(--accent-2)]"
                        size={15}
                      />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-white/55">
                      Main tebak judul cover dan kejar Top 3 untuk premium + badge.
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-[9px] text-white/35">
                        {notification.formattedTime}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-[var(--line-soft)] bg-[color:color-mix(in_srgb,var(--surface-2)_65%,transparent)] px-1.5 py-1 text-[9px] font-bold text-white/70">
                        Main
                        <FiArrowRight size={10} />
                      </span>
                    </div>
                  </Link>
                ) : notification.type === "premium_reward" ? (
                  <Link
                    prefetch={false}
                    key={notification.id}
                    href="/premium-pay"
                    onClick={() => setShowNotif(false)}
                    className="block border-b border-[var(--line-soft)] bg-[color:color-mix(in_srgb,var(--accent-2)_8%,transparent)] p-2.5 transition-colors hover:bg-[color:color-mix(in_srgb,var(--accent-2)_12%,transparent)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:color-mix(in_srgb,var(--accent-2)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--accent-2)_12%,transparent)]">
                          <FiAward size={15} className="text-[var(--accent-2)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-black text-white">
                            Hadiah Title Rush
                          </p>
                          <p className="truncate text-[9px] font-bold uppercase tracking-wide text-[var(--accent-2)]">
                            {notification.actor_name || "Premium Event"}
                          </p>
                        </div>
                      </div>
                      <RiVipCrownLine
                        className="shrink-0 text-[var(--accent-2)]"
                        size={15}
                      />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-white/55">
                      Premium hadiah event sudah aktif di akun kamu.
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-[9px] text-white/35">
                        {notification.formattedTime}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-[var(--line-soft)] bg-[color:color-mix(in_srgb,var(--surface-2)_65%,transparent)] px-1.5 py-1 text-[9px] font-bold text-white/70">
                        Cek Premium
                        <FiArrowRight size={10} />
                      </span>
                    </div>
                  </Link>
                ) : notification.type === "premium_activated" ? (
                  <Link
                    prefetch={false}
                    key={notification.id}
                    href="/premium-pay"
                    onClick={() => setShowNotif(false)}
                    className="block border-b border-[var(--line-soft)] bg-[color:color-mix(in_srgb,var(--accent)_8%,transparent)] p-2.5 transition-colors hover:bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--accent)_12%,transparent)]">
                          <RiVipCrownLine
                            size={15}
                            className="text-[var(--accent-2)]"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-black text-white">
                            Premium Aktif
                          </p>
                          <p className="truncate text-[9px] font-bold uppercase tracking-wide text-[var(--accent-2)]">
                            Akun berhasil diupgrade
                          </p>
                        </div>
                      </div>
                      <FiCheckCircle
                        className="shrink-0 text-[var(--accent-2)]"
                        size={15}
                      />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-white/55">
                      Fitur premium sudah terbuka di akun kamu.
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-[9px] text-white/35">
                        {notification.formattedTime}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-[var(--line-soft)] bg-[color:color-mix(in_srgb,var(--surface-2)_65%,transparent)] px-1.5 py-1 text-[9px] font-bold text-white/70">
                        Lihat
                        <FiArrowRight size={10} />
                      </span>
                    </div>
                  </Link>
                ) : (
                  <Link
                    prefetch={false}
                    key={notification.id}
                    href={getNotifLink(notification)}
                    onClick={() => setShowNotif(false)}
                    className="flex gap-2.5 border-b border-[var(--line-soft)] p-3 transition-colors hover:bg-[color:color-mix(in_srgb,var(--surface-2)_55%,transparent)]"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--surface-2)_65%,transparent)] text-white/45">
                      <FiMessageCircle size={13} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] leading-snug text-white/70">
                        <span className="font-bold text-[var(--accent-2)]">
                          {notification.actor_name || "User"}
                        </span>{" "}
                        membalas komentar kamu
                      </p>
                      <span className="mt-1 block text-[9px] text-white/30">
                        {notification.formattedTime}
                      </span>
                    </div>
                  </Link>
                ),
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
