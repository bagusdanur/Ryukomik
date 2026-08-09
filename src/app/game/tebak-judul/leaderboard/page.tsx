"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import VipBadge from "@/components/VipBadge";
import TitleRushWinnerBadge from "@/components/TitleRushWinnerBadge";
import Button from "@/components/Button";
import { FaCrown, FaMedal, FaTrophy } from "react-icons/fa";
import { FiArrowLeft, FiAward, FiClock, FiRefreshCw, FiTarget, FiUser } from "react-icons/fi";

type LeaderboardRow = {
  rank: number;
  user_id: string;
  username: string;
  avatar_url?: string | null;
  role?: string | null;
  is_premium?: boolean;
  score: number;
  total_rounds: number;
  best_streak: number;
  updated_at: string;
};

type LeaderboardPayload = {
  week_start: string;
  active_title_week?: string;
  active_winners?: LeaderboardRow[];
  history?: Array<{
    week_start: string;
    winners: LeaderboardRow[];
  }>;
  rows: LeaderboardRow[];
};

const prizes = [
  { rank: 1, label: "Premium 7 Hari", icon: FaCrown },
  { rank: 2, label: "Premium 5 Hari", icon: FaTrophy },
  { rank: 3, label: "Premium 3 Hari", icon: FaMedal },
];

const rankIcons = [FaCrown, FaTrophy, FaMedal];

function getPrize(rank: number) {
  return prizes.find((item) => item.rank === rank);
}

function getPlayCount(totalRounds: number) {
  return Math.max(1, Math.ceil(totalRounds / 10));
}

function formatWeekRange(weekStart: string) {
  if (!weekStart) return "-";

  const start = new Date(`${weekStart}T00:00:00+07:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return `${start.toLocaleDateString("id-ID", {
    day: "numeric",
    month: start.getMonth() === end.getMonth() ? undefined : "short",
  })} - ${end.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

function Avatar({ row }: { row: LeaderboardRow }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/[.06]">
      {row.avatar_url ? (
        <img
          src={row.avatar_url}
          alt=""
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span className="text-sm font-black uppercase text-white/45">
          {row.username.charAt(0)}
        </span>
      )}
    </div>
  );
}

function RankRow({
  row,
  isSelf,
  activeTitleRank,
}: {
  row: LeaderboardRow;
  isSelf: boolean;
  activeTitleRank?: number | null;
}) {
  const prize = getPrize(row.rank);
  const PrizeIcon = prize?.icon;
  const RankIcon = rankIcons[row.rank - 1] || FiUser;

  return (
    <article
      className={`flex items-center gap-2.5 border-b border-white/[.06] px-2.5 py-3 last:border-b-0 sm:gap-3 sm:px-3 ${
        isSelf ? "bg-[color:color-mix(in_srgb,var(--accent-2)_8%,transparent)]" : ""
      }`}
    >
      <div className="flex w-8 shrink-0 flex-col items-center gap-1 sm:w-9">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs ${
            row.rank <= 3
              ? "border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent-2)]"
              : "border-white/[.08] bg-white/[.04] text-white/45"
          }`}
        >
          <RankIcon />
        </span>
        <span className="text-[9px] font-black text-white/35">#{row.rank}</span>
      </div>
      <Avatar row={row} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href={`/u/${encodeURIComponent(row.username)}`}
            className="max-w-[92px] truncate text-sm font-black transition-colors duration-200 hover:text-[var(--accent-2)] sm:max-w-none"
          >
            {row.username}
          </Link>
          {isSelf && (
            <span className="rounded-md border border-[var(--accent-2)]/25 bg-[var(--accent-2)]/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-[var(--accent-2)]">
              Kamu
            </span>
          )}
          {row.is_premium && <VipBadge className="text-[8px]" />}
          <TitleRushWinnerBadge rank={activeTitleRank} className="text-[8px]" />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-white/45 sm:text-[11px]">
          <span className="inline-flex items-center gap-1">
            <FiTarget size={12} />
            {row.score} poin
          </span>
          <span className="inline-flex items-center gap-1">
            <FiAward size={12} />
            Main {getPlayCount(row.total_rounds)}x
          </span>
          {prize && PrizeIcon ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)]/10 px-1.5 py-1 text-[9px] font-bold text-[var(--accent-2)]">
              <PrizeIcon size={10} />
              {prize.label.replace("Premium ", "")}
            </span>
          ) : null}
        </div>
      </div>
      <div className="w-9 shrink-0 text-right sm:w-12">
        <p className="text-lg font-black text-white">{row.score}</p>
        <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">
          Poin
        </p>
      </div>
    </article>
  );
}

export default function TitleRushLeaderboardPage() {
  const { user, loading: userLoading } = useSupabaseUser();
  const [payload, setPayload] = useState<LeaderboardPayload | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    const leaderboardResult = await fetch("/api/game/title-rush/leaderboard").then((res) =>
      res.json(),
    );

    setCurrentUserId(user?.id || null);
    setPayload(
      Array.isArray(leaderboardResult?.rows)
        ? leaderboardResult
        : { week_start: "", rows: [] },
    );
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (userLoading) return;
    void Promise.resolve().then(loadLeaderboard);
  }, [loadLeaderboard, userLoading]);

  const rows = payload?.rows || [];
  const activeWinnerRank = new Map(
    (payload?.active_winners || []).map((winner) => [winner.user_id, winner.rank]),
  );

  return (
    <main className="rk-page px-3 pb-24 pt-4 text-white sm:px-4 sm:pt-5">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/game"
            className="rk-btn-ghost inline-flex h-10 w-10 items-center justify-center rounded-lg"
            aria-label="Kembali ke game"
          >
            <FiArrowLeft />
          </Link>
          <Button
            variant="ghost"
            type="button"
            onClick={loadLeaderboard}
            className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold"
          >
            <FiRefreshCw />
            Refresh
          </Button>
        </div>

        <section className="rk-card mb-3 overflow-hidden rounded-lg sm:mb-4">
          <div className="border-b border-white/[.08] bg-[var(--surface-2)] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.22em] text-[var(--accent-2)]">
                  Ryukomik Title Rush
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black leading-tight sm:text-3xl">
                    Weekly Leaderboard
                  </h1>
                  <span className="rounded-md border border-[var(--accent-2)]/25 bg-[var(--accent-2)]/10 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-[var(--accent-2)]">
                    Top 10
                  </span>
                </div>
                <p className="mt-2 max-w-md text-xs leading-5 text-white/60 sm:mt-3 sm:text-sm sm:leading-6">
                  Ranking event mingguan. Poin dari semua sesi bermain user
                  login akan dijumlahkan.
                </p>
              </div>
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/[.08] bg-white/[.04] text-[var(--accent-2)] sm:flex">
                <FiAward size={20} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-white/[.08] bg-white/[.04] px-3 py-2">
                <p className="text-white/35">Minggu ini</p>
                <p className="mt-1 font-bold text-white">
                  {payload?.week_start || "Minggu ini"}
                </p>
              </div>
              <div className="rounded-lg border border-white/[.08] bg-white/[.04] px-3 py-2">
                <p className="text-white/35">Reset</p>
                <p className="mt-1 inline-flex items-center gap-1 font-bold text-white">
                  <FiClock size={12} />
                  Senin 00:00 WIB
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-3 grid grid-cols-3 gap-2 sm:mb-4">
          {prizes.map((prize) => {
            const Icon = prize.icon;
            return (
              <div key={prize.rank} className="rk-card-soft rounded-lg p-2.5 text-center sm:p-3">
                <Icon className="mx-auto mb-1.5 text-[var(--accent-2)] sm:mb-2" />
                <p className="text-[9px] font-black uppercase tracking-widest text-white/35 sm:text-[10px]">
                  Juara {prize.rank}
                </p>
                <p className="mt-1 text-[11px] font-black leading-snug sm:text-xs">{prize.label}</p>
              </div>
            );
          })}
        </div>

        {loading ? (
          <div className="rk-card-soft rounded-lg p-8 text-center text-sm text-white/50">
            Memuat leaderboard...
          </div>
        ) : rows.length === 0 ? (
          <div className="rk-card-soft rounded-lg p-8 text-center">
            <p className="text-sm font-black">Belum ada skor minggu ini.</p>
            <p className="mt-2 text-xs text-white/50">
              Login dan mainkan event untuk masuk leaderboard.
            </p>
          </div>
        ) : (
          <section className="rk-card overflow-hidden rounded-lg">
            <div className="grid grid-cols-[42px_minmax(0,1fr)_42px] border-b border-white/[.08] bg-[var(--surface-2)] px-2.5 py-2 text-[9px] font-black uppercase tracking-widest text-white/35 sm:grid-cols-[48px_minmax(0,1fr)_76px] sm:px-3 sm:text-[10px]">
              <span>Rank</span>
              <span>User</span>
              <span className="text-right">Poin</span>
            </div>
            {rows.map((row) => (
              <RankRow
                key={row.user_id}
                row={row}
                isSelf={row.user_id === currentUserId}
                activeTitleRank={activeWinnerRank.get(row.user_id)}
              />
            ))}
          </section>
        )}

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-white">Riwayat Pemenang</p>
              <p className="text-[11px] text-white/40">
                Title aktif 1 minggu setelah event selesai.
              </p>
            </div>
            <FiAward className="text-[var(--accent-2)]" />
          </div>

          {payload?.history?.length ? (
            <div className="space-y-3">
              {payload.history.map((week) => (
                <div key={week.week_start} className="rk-card-soft rounded-lg p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-white">
                      {formatWeekRange(week.week_start)}
                    </p>
                    {week.week_start === payload.active_title_week && (
                      <span className="rounded-md border border-[var(--accent-2)]/25 bg-[var(--accent-2)]/10 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-[var(--accent-2)]">
                        Title Aktif
                      </span>
                    )}
                  </div>
                  <div className="grid gap-2">
                    {week.winners.map((winner) => {
                      const Icon = rankIcons[winner.rank - 1] || FiUser;

                      return (
                        <Link
                          key={winner.user_id}
                          href={`/u/${encodeURIComponent(winner.username)}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-white/[.06] bg-white/[.03] px-3 py-2"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[.05] text-[var(--accent-2)]">
                              <Icon size={13} />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-bold text-white">
                                {winner.username}
                              </span>
                              <span className="text-[10px] text-white/40">
                                {winner.score} poin
                              </span>
                            </span>
                          </span>
                          <TitleRushWinnerBadge rank={winner.rank} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rk-card-soft rounded-lg p-6 text-center text-xs text-white/45">
              Belum ada riwayat pemenang.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
