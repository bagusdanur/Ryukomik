"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiAward, FiBookOpen, FiClock, FiBookmark, FiMessageCircle, FiTrendingUp } from "react-icons/fi";
import { getSession } from "@/lib/auth/getSession";

type StatsData = {
  profile: { xp: number; level: number; totalReads: number; isPremium: boolean } | null;
  reads: { total: number; today: number; week: number };
  streakDays: number;
  last7Days: Array<{ day: string; count: number }>;
  recent: Array<{ slug: string; title: string | null; source: string | null; lastChapter: string | null; readAt: string }>;
  bookmarks: number;
  comments: number;
};

function shortDay(day: string) {
  const d = new Date(`${day}T00:00:00`);
  return d.toLocaleDateString("id-ID", { weekday: "short" }).replace(".", "");
}

export default function StatsPage() {
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
    return (
      <div className="rk-page rk-app-surface">
        <div className="rk-shell px-4 pt-24 pb-24">
          <p className="text-center text-sm text-white/40">Memuat statistik…</p>
        </div>
      </div>
    );
  }

  if (needLogin || !data) {
    return (
      <div className="rk-page rk-app-surface">
        <div className="rk-shell px-4 pt-24 pb-24 text-center">
          <p className="text-sm text-white/60">Login dulu untuk melihat statistik bacaanmu.</p>
          <Link href="/" className="mt-4 inline-block rounded-full bg-[#7c5cfc] px-5 py-2 text-sm font-bold text-white">
            Ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const maxWeek = Math.max(1, ...data.last7Days.map((d) => d.count));
  const xpToNext = data.profile ? (data.profile.level * 100 - data.profile.xp) % 100 : 0;

  const cards = [
    { icon: <FiBookOpen size={16} />, label: "Chapter dibaca", value: data.reads.total, sub: `${data.reads.today} hari ini` },
    { icon: <FiClock size={16} />, label: "Streak baca", value: data.streakDays, sub: "hari beruntun" },
    { icon: <FiAward size={16} />, label: "Level", value: data.profile?.level ?? 0, sub: `${data.profile?.xp ?? 0} XP` },
    { icon: <FiBookmark size={16} />, label: "Bookmark", value: data.bookmarks, sub: "seri disimpan" },
  ];

  return (
    <div className="rk-page rk-app-surface">
      <div className="rk-shell px-4 pt-24 pb-24">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7c5cfc]/15 text-[#a997ff]">
            <FiTrendingUp size={18} />
          </div>
          <div>
            <h1 className="text-lg font-black text-white">Statistik Bacaan</h1>
            <p className="text-[11px] text-white/35">Ringkasan aktivitasmu di Ryukomik</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-white/[.06] bg-[#13131a] p-4">
              <div className="text-[#a997ff]">{card.icon}</div>
              <p className="mt-2 text-xl font-black text-white">{card.value.toLocaleString("id-ID")}</p>
              <p className="text-[11px] font-semibold text-white/60">{card.label}</p>
              <p className="text-[10px] text-white/30">{card.sub}</p>
            </div>
          ))}
        </div>

        {data.profile && (
          <div className="mt-3 rounded-2xl border border-white/[.06] bg-[#13131a] p-4">
            <div className="flex items-center justify-between text-[11px] text-white/50">
              <span>Menuju level {data.profile.level + 1}</span>
              <span>{xpToNext} XP lagi</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.06]">
              <div className="h-full rounded-full bg-[#7c5cfc]" style={{ width: `${Math.min(100, ((data.profile.xp % 100) / 100) * 100)}%` }} />
            </div>
          </div>
        )}

        <div className="mt-3 rounded-2xl border border-white/[.06] bg-[#13131a] p-4">
          <p className="text-[13px] font-bold text-white">Bacaan 7 hari terakhir</p>
          <div className="mt-3 flex items-end justify-between gap-2">
            {data.last7Days.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] font-bold text-white/50">{d.count}</span>
                <div className="flex h-20 w-full items-end">
                  <div
                    className="w-full rounded-t-md bg-[#7c5cfc]/70"
                    style={{ height: `${Math.max(4, (d.count / maxWeek) * 100)}%` }}
                    title={`${d.day}: ${d.count} chapter`}
                  />
                </div>
                <span className="text-[10px] text-white/35">{shortDay(d.day)}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/35">
            <FiMessageCircle size={11} />
            {data.comments.toLocaleString("id-ID")} komentar ditulis · {data.reads.week} chapter minggu ini
          </p>
        </div>

        {data.recent.length > 0 && (
          <div className="mt-3 rounded-2xl border border-white/[.06] bg-[#13131a] p-4">
            <p className="text-[13px] font-bold text-white">Terakhir dibaca</p>
            <div className="mt-2 divide-y divide-white/[.04]">
              {data.recent.map((item) => (
                <Link
                  key={`${item.source || ""}:${item.slug}`}
                  href={item.source ? `/komik/${item.source}/${item.slug}` : "/"}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <span className="min-w-0 truncate text-xs font-semibold text-white/80">{item.title || item.slug}</span>
                  <span className="shrink-0 text-[10px] text-[#a997ff]">{item.lastChapter || ""}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
