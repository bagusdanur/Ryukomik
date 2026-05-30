"use client";

import { useState } from "react";
import { FaCrown, FaMedal, FaTrophy } from "react-icons/fa";
import { FiAward, FiCalendar, FiCheck, FiChevronDown, FiRefreshCw, FiTrash2, FiX } from "react-icons/fi";
import { Avatar } from "./dashboardUtils";

export type TitleRushWinner = {
  rank: number;
  prize_days: number;
  user_id: string;
  username: string;
  avatar_url?: string | null;
  score: number;
  total_rounds: number;
  best_streak: number;
  premium_until?: string | null;
  awarded_at?: string | null;
};

type EventRewardsTabProps = {
  winners: TitleRushWinner[];
  weekStart: string;
  currentWeek: string;
  weeks: string[];
  loading: boolean;
  awarding: boolean;
  deleting: boolean;
  debugAward: boolean;
  notice: string;
  eventEnabled: boolean;
  statusLoading: boolean;
  fetchWinners: () => void;
  awardWinners: () => void;
  deleteCurrentWeek: () => void;
  selectWeek: (weekStart: string) => void;
  setDebugAward: (enabled: boolean) => void;
  toggleEventEnabled: () => void;
};

const rankIcons = [FaCrown, FaTrophy, FaMedal];

function formatPremiumUntil(value?: string | null) {
  if (!value) return "Belum premium";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getPlayCount(totalRounds: number) {
  return Math.max(1, Math.ceil(totalRounds / 10));
}

function getPrizeDays(rank: number) {
  if (rank === 1) return 7;
  if (rank === 2) return 5;
  if (rank === 3) return 3;
  return 0;
}

function isAwarded(winner: TitleRushWinner) {
  return Boolean(winner.awarded_at);
}

function parseJakartaDate(value: string) {
  return new Date(`${value}T00:00:00+07:00`);
}

function formatDateRange(weekStart: string) {
  if (!weekStart) return "-";

  const start = parseJakartaDate(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  const startText = start.toLocaleDateString("id-ID", {
    day: "numeric",
    month: sameMonth ? undefined : "short",
    year: sameYear ? undefined : "numeric",
  });
  const endText = end.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${startText} - ${endText}`;
}

export default function EventRewardsTab({
  winners,
  weekStart,
  currentWeek,
  weeks,
  loading,
  awarding,
  deleting,
  debugAward,
  notice,
  eventEnabled,
  statusLoading,
  fetchWinners,
  awardWinners,
  deleteCurrentWeek,
  selectWeek,
  setDebugAward,
  toggleEventEnabled,
}: EventRewardsTabProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [weekModalOpen, setWeekModalOpen] = useState(false);
  const isCurrentWeek = Boolean(currentWeek && weekStart === currentWeek);
  const canAward = !isCurrentWeek || debugAward;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-bold text-white">Hadiah Event</p>
          <p className="text-[11px] text-white/35">
            Ryukomik Title Rush · {formatDateRange(weekStart)}
          </p>
        </div>
        <button
          onClick={fetchWinners}
          disabled={loading || awarding}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[.08] bg-white/[.05] text-white/40 transition-colors hover:text-white disabled:opacity-50"
          aria-label="Refresh pemenang"
        >
          <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <section className="rk-card-soft rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  eventEnabled ? "bg-[var(--accent-2)]" : "bg-[var(--accent-3)]"
                }`}
              />
              <p className="text-sm font-bold text-white">Status Event</p>
            </div>
            <p className="mt-1 text-[10px] leading-4 text-white/40">
              {eventEnabled
                ? "User bisa bermain dan skor masuk leaderboard."
                : "Event ditutup, user tidak bisa menyimpan skor."}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleEventEnabled}
            disabled={statusLoading}
            className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
              eventEnabled
                ? "border-[var(--accent-2)]/35 bg-[var(--accent-2)]/25"
                : "border-white/[.08] bg-white/[.08]"
            } disabled:opacity-50`}
            aria-label={eventEnabled ? "Tutup event" : "Buka event"}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                eventEnabled ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>
      </section>

      <section className="rk-card-soft rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <FiAward className="text-[var(--accent-2)]" />
          <p className="text-sm font-bold text-white">Reward Mingguan</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Juara 1", "7 hari"],
            ["Juara 2", "5 hari"],
            ["Juara 3", "3 hari"],
          ].map(([rank, prize], index) => {
            const Icon = rankIcons[index];

            return (
              <div key={rank} className="rounded-xl border border-white/[.08] bg-white/[.04] p-3">
                <Icon className="mx-auto mb-2 text-[var(--accent-2)]" />
                <p className="text-[10px] font-black uppercase tracking-wide text-white/40">
                  {rank}
                </p>
                <p className="mt-1 text-xs font-bold text-white">{prize}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rk-card-soft rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">Pilih Minggu</p>
            <p className="text-[10px] text-white/35">
              Hadiah hanya bisa diberikan setelah minggu event selesai
            </p>
          </div>
          {isCurrentWeek && (
            <span className="rounded-lg border border-white/[.08] bg-white/[.04] px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white/45">
              Berjalan
            </span>
          )}
        </div>
        <button
          onClick={() => setWeekModalOpen(true)}
          disabled={loading || awarding || deleting}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/[.08] bg-white/[.04] px-3 py-3 text-left disabled:opacity-50"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--accent-2)]/25 bg-[var(--accent-2)]/10 text-[var(--accent-2)]">
              <FiCalendar />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-black text-white">
                {formatDateRange(weekStart)}
              </span>
              <span className="mt-0.5 block text-[10px] text-white/35">
                {weekStart || "Belum ada minggu"}
              </span>
            </span>
          </span>
          <FiChevronDown className="shrink-0 text-white/35" />
        </button>
      </section>

      <section className="rounded-2xl border border-white/[.08] bg-white/[.04] p-3">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-xs font-black text-white">
              Debug hadiah
            </span>
            <span className="mt-0.5 block text-[10px] leading-4 text-white/40">
              Izinkan kasih hadiah walau minggu masih berjalan.
            </span>
          </span>
          <input
            type="checkbox"
            checked={debugAward}
            onChange={(event) => setDebugAward(event.target.checked)}
            className="h-4 w-4 shrink-0 accent-[var(--accent-2)]"
          />
        </label>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={awardWinners}
          disabled={loading || awarding || deleting || winners.length === 0 || !canAward}
          className="rk-btn-primary flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl px-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {awarding ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <FiCheck className="shrink-0" />
          )}
          <span className="truncate">
            {isCurrentWeek && !debugAward ? "Belum Selesai" : debugAward ? "Debug Hadiah" : "Kasih Hadiah"}
          </span>
        </button>

        <button
          onClick={() => setConfirmDelete(true)}
          disabled={loading || awarding || deleting || winners.length === 0}
          className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-[var(--accent-3)]/25 bg-[var(--accent-3)]/10 px-2 text-xs font-bold text-[var(--accent-3)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiTrash2 className="shrink-0" />
          <span className="truncate">Hapus Data</span>
        </button>
      </div>

      {isCurrentWeek && !debugAward && (
        <div className="rounded-xl border border-white/[.08] bg-white/[.04] px-3 py-2 text-xs font-semibold leading-5 text-white/55">
          Minggu {weekStart} masih berjalan. Hadiah baru bisa diberikan setelah
          masuk minggu berikutnya.
        </div>
      )}

      {isCurrentWeek && debugAward && (
        <div className="rounded-xl border border-[var(--accent-3)]/25 bg-[var(--accent-3)]/10 px-3 py-2 text-xs font-semibold leading-5 text-[var(--accent-3)]">
          Mode debug aktif. Hadiah minggu berjalan bisa dikirim untuk testing.
        </div>
      )}

      {confirmDelete && (
        <div className="rounded-2xl border border-[var(--accent-3)]/25 bg-[var(--accent-3)]/10 p-3">
          <p className="text-xs font-semibold leading-5 text-white/75">
            Hapus semua skor Title Rush periode {formatDateRange(weekStart)}?
            Data ini tidak bisa dikembalikan.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="h-10 rounded-xl border border-white/[.08] bg-white/[.05] text-xs font-bold text-white/60 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={() => {
                setConfirmDelete(false);
                deleteCurrentWeek();
              }}
              disabled={deleting}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--accent-3)] text-xs font-bold text-white disabled:opacity-50"
            >
              {deleting ? (
                <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
              ) : (
                <FiTrash2 />
              )}
              Hapus
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div className="rounded-xl border border-[var(--accent-2)]/25 bg-[var(--accent-2)]/10 px-3 py-2 text-xs font-semibold text-[var(--accent-2)]">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      ) : winners.length === 0 ? (
        <div className="rk-card-soft rounded-2xl border-dashed py-12 text-center">
          <FiAward size={28} className="mx-auto mb-2 text-white/10" />
          <p className="text-[13px] text-white/30">
            Belum ada skor leaderboard minggu ini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {winners.map((winner) => {
            const Icon = rankIcons[winner.rank - 1] || FiAward;
            const prizeDays = winner.prize_days || getPrizeDays(winner.rank);

            return (
              <div key={winner.user_id} className="rk-card-soft rounded-2xl p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar
                      name={winner.username}
                      url={winner.avatar_url || ""}
                      size={38}
                    />
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-[13px] font-bold text-white">
                          {winner.username}
                        </p>
                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                            isAwarded(winner)
                              ? "bg-[var(--accent-2)]/10 text-[var(--accent-2)]"
                              : "bg-white/[.06] text-white/40"
                          }`}
                        >
                          {isAwarded(winner) ? "Sudah dikirim" : "Belum dikirim"}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/35">
                        Premium sampai {formatPremiumUntil(winner.premium_until)}
                      </p>
                    </div>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[.08] bg-white/[.05] text-[var(--accent-2)]">
                    <Icon />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-white/[.04] px-2 py-2">
                    <p className="text-white/35">Rank</p>
                    <p className="mt-1 font-black text-white">#{winner.rank}</p>
                  </div>
                  <div className="rounded-lg bg-white/[.04] px-2 py-2">
                    <p className="text-white/35">Hadiah</p>
                    <p className="mt-1 font-black text-white">
                      {prizeDays ? `${prizeDays} hari` : "-"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/[.04] px-2 py-2">
                    <p className="text-white/35">Poin</p>
                    <p className="mt-1 font-black text-white">
                      {winner.score}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/[.04] px-2 py-2">
                    <p className="text-white/35">Main</p>
                    <p className="mt-1 font-black text-white">
                      {getPlayCount(winner.total_rounds)}x
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {weekModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center">
          <div className="w-full max-w-[440px] rounded-2xl border border-white/[.08] bg-[var(--surface-1)] p-4 text-white">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black">Pilih Minggu Event</p>
                <p className="text-[10px] text-white/35">
                  Pilih periode leaderboard yang ingin dicek
                </p>
              </div>
              <button
                onClick={() => setWeekModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[.08] bg-white/[.04] text-white/50"
                aria-label="Tutup modal minggu"
              >
                <FiX />
              </button>
            </div>

            <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {weeks.map((week) => {
                const selected = week === weekStart;
                const running = week === currentWeek;

                return (
                  <button
                    key={week}
                    onClick={() => {
                      setConfirmDelete(false);
                      setWeekModalOpen(false);
                      selectWeek(week);
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left ${
                      selected
                        ? "border-[var(--accent-2)]/35 bg-[var(--accent-2)]/10"
                        : "border-white/[.08] bg-white/[.03]"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-black text-white">
                        {formatDateRange(week)}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-white/35">
                        {week}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-wide ${
                        running
                          ? "bg-white/[.06] text-white/45"
                          : selected
                            ? "bg-[var(--accent-2)]/15 text-[var(--accent-2)]"
                            : "bg-white/[.05] text-white/35"
                      }`}
                    >
                      {running ? "Berjalan" : selected ? "Dipilih" : "Pilih"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
