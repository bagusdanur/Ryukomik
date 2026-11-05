"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiAward, FiBookOpen, FiClock, FiBookmark, FiMessageCircle, FiTrendingUp } from "react-icons/fi";
import { getSession } from "@/lib/auth/getSession";
import HistoryThumb from "@/components/history/HistoryThumb";

type StatsData = {
  profile: { xp: number; level: number; totalReads: number; isPremium: boolean } | null;
  reads: { total: number; today: number; week: number };
  streakDays: number;
  last7Days: Array<{ day: string; count: number }>;
  recent: Array<{ slug: string; title: string | null; source: string | null; lastChapter: string | null; lastChapterSlug: string | null; thumbnail: string | null; readAt: string }>;
  bookmarks: number;
  comments: number;
};

function formatTitleFromSlug(slug?: string | null) {
  if (!slug) return "Tanpa judul";
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function chapterLabel(text?: string | null, slug?: string | null) {
  let raw = "";
  if (text) {
    const m = text.match(/(?:chapter|ch)\s*([\d.]+)/i) || text.match(/([\d.]+)$/);
    if (m) raw = m[1];
  }
  if (!raw && slug) {
    const m = slug.match(/(?:chapter|ch)[-/]([\d.]+)/i) || slug.match(/(\d+)(?!.*\d)/);
    if (m) raw = m[1];
  }
  if (!raw) return "";
  const num = parseInt(raw.split(".")[0], 10);
  return Number.isNaN(num) ? "" : `Ch. ${num}`;
}

function isSlugLike(title: string | null) {
  if (!title) return true;
  if (/^(chapter|ch\.?)\s*[\d.]/i.test(title.trim())) return true;
  // slug: tidak ada spasi dan mengandung tanda hubung
  return !title.includes(" ") && title.includes("-");
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  if (!Number.isFinite(diff) || diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function shortDay(day: string) {
  const d = new Date(`${day}T00:00:00`);
  return d.toLocaleDateString("id-ID", { weekday: "short" }).replace(".", "");
}

/**
 * Panel statistik bacaan pribadi — dipakai sebagai tab "Statistik" di
 * halaman akun (/files) dan halaman /statistik. Ikut bahasa visual
 * globals.css: rk-card-soft, rk-chip, var(--accent)/--accent-2.
 */
export default function StatsPanel() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [needLogin, setNeedLogin] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: session } = await getSession();
        const token = session.session?.access_token;
        if (!token) {
          setNeedLogin(true);
          return;
        }
        const res = await fetch("/api/me/stats", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (res.ok) setData((await res.json()) as StatsData);
        else if (res.status === 401) setNeedLogin(true);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <p className="py-10 text-center text-sm" style={{ color: "var(--muted)" }}>Memuat statistik…</p>;
  }

  if (needLogin || !data) {
    return (
      <div className="rk-state rounded-2xl px-4 py-10 text-center">
        <p className="text-sm" style={{ color: "var(--muted)" }}>Login dulu untuk melihat statistik bacaanmu.</p>
      </div>
    );
  }

  const maxWeek = Math.max(1, ...data.last7Days.map((d) => d.count));
  const xpProgress = data.profile ? (data.profile.xp % 100) / 100 : 0;
  const xpToNext = data.profile ? 100 - (data.profile.xp % 100) : 0;

  const cards = [
    { icon: <FiBookOpen size={16} />, label: "Chapter dibaca", value: data.reads.total, sub: `${data.reads.today} hari ini` },
    { icon: <FiClock size={16} />, label: "Streak baca", value: data.streakDays, sub: "hari beruntun" },
    { icon: <FiAward size={16} />, label: "Level", value: data.profile?.level ?? 0, sub: `${data.profile?.xp ?? 0} XP` },
    { icon: <FiBookmark size={16} />, label: "Bookmark", value: data.bookmarks, sub: "seri disimpan" },
  ];

  return (
    <div className="min-w-0 space-y-3">
      <div className="rk-card-soft overflow-hidden rounded-2xl p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent-2)" }}>
            <FiTrendingUp size={18} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-black text-white">Statistik Bacaan</p>
            <p className="truncate text-[11px]" style={{ color: "var(--muted)" }}>Ringkasan aktivitasmu di Ryukomik</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border p-3" style={{ borderColor: "var(--line-soft)", background: "var(--surface-1)" }}>
              <div style={{ color: "var(--accent-2)" }}>{card.icon}</div>
              <p className="mt-1.5 text-lg font-black leading-none text-white">{card.value.toLocaleString("id-ID")}</p>
              <p className="mt-1 truncate text-[11px] font-semibold text-white/70">{card.label}</p>
              <p className="truncate text-[10px]" style={{ color: "var(--muted)" }}>{card.sub}</p>
            </div>
          ))}
        </div>

        {data.profile && (
          <div className="mt-2 rounded-xl border p-3" style={{ borderColor: "var(--line-soft)", background: "var(--surface-1)" }}>
            <div className="flex items-center justify-between gap-2 text-[11px]" style={{ color: "var(--muted)" }}>
              <span className="truncate">Menuju level {data.profile.level + 1}</span>
              <span className="shrink-0">{xpToNext} XP lagi</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "var(--surface-3)" }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, xpProgress * 100)}%`, background: "var(--accent)" }} />
            </div>
          </div>
        )}
      </div>

      <div className="rk-card-soft overflow-hidden rounded-2xl p-4">
        <p className="text-[13px] font-bold text-white">Bacaan 7 hari terakhir</p>
        <div className="mt-3 flex items-end justify-between gap-2">
          {data.last7Days.map((d) => (
            <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] font-bold" style={{ color: "var(--muted)" }}>{d.count}</span>
              <div className="flex h-20 w-full max-w-10 items-end">
                <div
                  className="w-full rounded-t-md"
                  style={{ height: `${Math.max(4, (d.count / maxWeek) * 100)}%`, background: "var(--accent)" }}
                  title={`${d.day}: ${d.count} chapter`}
                />
              </div>
              <span className="max-w-full truncate text-[10px]" style={{ color: "var(--muted)" }}>{shortDay(d.day)}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 flex min-w-0 items-center gap-1.5 text-[11px]" style={{ color: "var(--muted)" }}>
          <FiMessageCircle size={11} className="shrink-0" />
          <span className="min-w-0 truncate">{data.comments.toLocaleString("id-ID")} komentar ditulis · {data.reads.week} chapter minggu ini</span>
        </p>
      </div>

      {data.recent.length > 0 && (
        <div className="min-w-0">
          <p className="mb-2 px-1 text-[13px] font-bold text-white">Terakhir dibaca</p>
          <div className="flex flex-col gap-2">
            {data.recent.map((item) => {
              const title = isSlugLike(item.title) ? formatTitleFromSlug(item.slug) : item.title!;
              const chapter = chapterLabel(item.lastChapter, item.lastChapterSlug || item.slug);
              const href = item.source && item.lastChapterSlug
                ? `/chapter/${item.source}/${item.lastChapterSlug}`
                : item.source
                  ? `/komik/${item.source}/${item.slug}`
                  : "/";
              return (
                <Link
                  key={`${item.source || ""}:${item.slug}`}
                  href={href}
                  className="rk-card-soft group flex min-w-0 items-center justify-between rounded-2xl p-3 transition-colors duration-200 hover:border-cyan-200/20"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <HistoryThumb thumbnail={item.thumbnail || undefined} title={title} className="h-14 w-10 shrink-0" />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="line-clamp-2 text-sm font-medium text-white/90">{title}</span>
                      {chapter && <span className="truncate text-xs font-semibold text-cyan-200">{chapter}</span>}
                    </div>
                  </div>
                  <span className="ml-3 shrink-0 whitespace-nowrap text-[11px] text-white/45">{timeAgo(item.readAt)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
