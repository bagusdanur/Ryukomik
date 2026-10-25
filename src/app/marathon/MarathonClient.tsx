"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiClock, FiRefreshCw, FiTarget, FiTrendingUp, FiUser, FiZap } from "react-icons/fi";
import { RiFlashlightFill, RiTrophyFill } from "react-icons/ri";
import { FaCrown } from "react-icons/fa";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { supabase } from "@/lib/supabaseClient";
import UserBadges from "@/components/UserBadges";

type Period = "weekly" | "monthly";

type LeaderboardRow = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  level: number | null;
  is_premium: boolean | null;
  role: string | null;
  total_reads: number | null;
  chapters: number;
  rank: number;
  winner_rank?: number | null;
};

type EventInfo = {
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  prize1: string | null;
  prize2: string | null;
  prize3: string | null;
  prizes?: { rank: number; medal: string; days: number; label: string }[];
};

type Standing = {
  chapters: number;
  rank: number | null;
  total_players: number;
  third_chapters: number | null;
};

const MEDALS = ["🥇", "🥈", "🥉"];

const MEDAL_STYLE = [
  { ring: "#fbbf24", card: "rgba(251,191,36,0.05)", border: "rgba(251,191,36,0.28)" },
  { ring: "#cbd5e1", card: "rgba(203,213,225,0.04)", border: "rgba(203,213,225,0.22)" },
  { ring: "#f0883e", card: "rgba(240,136,62,0.04)", border: "rgba(240,136,62,0.22)" },
];

/** Akhir periode dalam WIB (UTC+7, tanpa DST). */
function periodEnd(period: Period, now: Date = new Date()): Date {
  const wib = new Date(now.getTime() + 7 * 3600 * 1000);
  const y = wib.getUTCFullYear();
  const m = wib.getUTCMonth();
  const d = wib.getUTCDate();
  if (period === "monthly") {
    return new Date(Date.UTC(y, m + 1, 1) - 7 * 3600 * 1000);
  }
  const weekday = wib.getUTCDay() || 7; // Senin = 1 .. Minggu = 7
  return new Date(Date.UTC(y, m, d + (8 - weekday)) - 7 * 3600 * 1000);
}

function countdown(target: Date, now: number) {
  const diff = target.getTime() - now;
  if (diff <= 0) return "Berakhir";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `${days}h ${hours}j`;
  if (hours > 0) return `${hours}j ${minutes}m`;
  return `${minutes}m`;
}

function Avatar({
  url,
  name,
  size,
  ring,
}: {
  url?: string | null;
  name: string;
  size: number;
  ring: string;
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.06]"
      style={{ width: size, height: size, boxShadow: `0 0 0 2px ${ring}` }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span className="font-black uppercase text-white/40" style={{ fontSize: size * 0.34 }}>
          {name.slice(0, 2)}
        </span>
      )}
    </span>
  );
}

function SelfTag() {
  return (
    <span className="rounded-full border border-cyan-400/35 bg-cyan-400/15 px-1.5 py-0.5 text-[8px] font-black uppercase leading-none tracking-widest text-cyan-200">
      Kamu
    </span>
  );
}

/* ─── Podium juara 1-3 ─── */
function PodiumCard({ row, index }: { row: LeaderboardRow; index: number }) {
  const medal = MEDAL_STYLE[index] ?? MEDAL_STYLE[2];

  return (
    <div
      className={`relative flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-2xl px-2 pb-3 pt-4 ${
        index === 0 ? "-mt-3 pb-4" : ""
      }`}
      style={{
        background: medal.card,
        border: `1px solid ${medal.border}`,
        boxShadow: index === 0 ? "0 8px 24px -12px rgba(251,191,36,0.14)" : undefined,
      }}
    >
      {index === 0 && (
        <FaCrown
          size={14}
          className="absolute -top-2 left-1/2 -translate-x-1/2 drop-shadow"
          style={{ color: medal.ring }}
        />
      )}

      <span
        className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-black"
        style={{ background: medal.ring }}
      >
        {index + 1}
      </span>

      <Avatar
        url={row.avatar_url}
        name={row.username}
        size={index === 0 ? 52 : 44}
        ring={medal.ring}
      />

      <p className="w-full truncate text-center text-[11px] font-bold leading-tight text-white">
        {row.username}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-1">
        <UserBadges
          role={row.role}
          isPremium={row.is_premium}
          totalReads={row.total_reads}
          className="text-[8px]"
        />
        {row.winner_rank ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-400/15 px-1.5 py-0.5 text-[8px] font-black uppercase leading-none tracking-widest text-amber-200">
              🏆 Juara {row.winner_rank}
            </span>
          ) : null}
      </div>

      <div className="mt-0.5 flex items-baseline gap-0.5">
        <span className="text-[15px] font-black leading-none text-white">
          {row.chapters.toLocaleString("id-ID")}
        </span>
        <span className="text-[9px] font-bold text-white/35">ch</span>
      </div>

      <span className="text-[9px] font-bold text-white/40">Lv.{row.level || 1}</span>
    </div>
  );
}

/* ─── Baris peringkat 4+ ─── */
function RankRow({
  row,
  maxChapters,
  isSelf,
}: {
  row: LeaderboardRow;
  maxChapters: number;
  isSelf: boolean;
}) {
  const ringColor = isSelf ? "#22d3ee" : "rgba(255,255,255,0.14)";
  const relative = maxChapters > 0 ? Math.max(3, Math.round((row.chapters / maxChapters) * 100)) : 0;

  return (
    <div
      className="flex items-center gap-2.5 rounded-2xl px-2.5 py-2.5"
      style={{
        background: isSelf ? "rgba(34,211,238,0.08)" : "rgba(255,255,255,0.022)",
        border: `1px solid ${isSelf ? "rgba(34,211,238,0.28)" : "rgba(255,255,255,0.055)"}`,
      }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[11px] font-black"
        style={{
          background: isSelf ? "rgba(34,211,238,0.15)" : "rgba(255,255,255,0.045)",
          color: isSelf ? "#67e8f9" : "rgba(255,255,255,0.42)",
        }}
      >
        {row.rank}
      </span>

      <Avatar url={row.avatar_url} name={row.username} size={38} ring={ringColor} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1">
          <span
            className="max-w-[120px] truncate text-[12px] font-bold"
            style={{ color: isSelf ? "#67e8f9" : "#fff" }}
          >
            {row.username}
          </span>
          {isSelf && <SelfTag />}
          <UserBadges
            role={row.role}
            isPremium={row.is_premium}
            totalReads={row.total_reads}
            className="text-[8px]"
          />
          {row.winner_rank ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-400/15 px-1.5 py-0.5 text-[8px] font-black uppercase leading-none tracking-widest text-amber-200">
              🏆 Juara {row.winner_rank}
            </span>
          ) : null}
        </div>

        <div className="mt-1 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${relative}%`,
                background: "linear-gradient(90deg, #22d3ee, #8b5cf6)",
              }}
            />
          </div>
          <span className="shrink-0 text-[9px] font-bold text-white/35">Lv.{row.level || 1}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[13px] font-black leading-none text-white">
          {row.chapters.toLocaleString("id-ID")}
        </p>
        <p className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-white/25">ch</p>
      </div>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 flex-1 animate-pulse rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/[0.03]" />
      ))}
    </div>
  );
}

export default function MarathonClient() {
  const { user } = useSupabaseUser();
  const [period, setPeriod] = useState<Period>("weekly");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [standing, setStanding] = useState<Standing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/marathon/leaderboard?period=${period}`, {
        signal: AbortSignal.timeout(15_000),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Gagal memuat leaderboard.");
      setRows((json?.rows ?? []) as LeaderboardRow[]);
      setEvent((json?.event ?? null) as EventInfo | null);
    } catch (cause) {
      const timedOut =
        cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError");
      setError(
        timedOut
          ? "Server tidak merespons (timeout 15 detik). Coba lagi."
          : cause instanceof Error
            ? cause.message
            : "Gagal memuat leaderboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [period]);

  const loadStanding = useCallback(async () => {
    if (!user?.id) {
      setStanding(null);
      return;
    }
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/marathon/me", {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return;
      const json = await res.json();
      setStanding((json?.[period] ?? null) as Standing | null);
    } catch {
      // Posisi pribadi bersifat opsional — jangan ganggu leaderboard.
    }
  }, [period, user?.id]);

  useEffect(() => {
    void load();
    void loadStanding();
  }, [load, loadStanding]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const maxChapters = rows[0]?.chapters ?? 0;
  const endsAt = useMemo(
    () => (event?.endsAt ? new Date(event.endsAt) : periodEnd(period, new Date(now))),
    [event?.endsAt, period, now],
  );

  const gapToTop3 =
    standing && standing.third_chapters !== null && standing.rank !== null && standing.rank > 3
      ? Math.max(0, standing.third_chapters - standing.chapters + 1)
      : null;

  const prizes =
    event?.prizes && event.prizes.length
      ? event.prizes
      : [1, 2, 3].map((rank) => ({ rank, medal: MEDALS[rank - 1], days: 0, label: "Menyusul" }));
  const prizeTitle = period === "monthly" ? "Hadiah bulanan" : "Hadiah mingguan";

  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-amber-400/20 bg-[#12141e] p-4 text-center">
        <span className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[.16em] text-amber-300">
            <RiFlashlightFill size={9} /> Speedrun Baca
          </p>
          <h1 className="mt-2 text-xl font-black text-white">{event?.title || "Marathon Baca"}</h1>
          <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-white/50">
            {event?.description ||
              "Baca sebanyak mungkin chapter tiap minggu & bulan. Juara 1-3 dapat hadiah premium."}
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/25 px-3 py-1.5 text-[11px] font-bold text-white/70">
            <FiClock size={11} className="text-cyan-300" />
            Sisa <span className="text-cyan-300">{countdown(endsAt, now)}</span>
          </div>

          <p className="mt-3 text-[8.5px] font-black uppercase tracking-[0.14em] text-white/30">
            {prizeTitle}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
            {prizes.map((prize) => (
              <span
                key={prize.rank}
                className="inline-flex items-center gap-1 rounded-full border border-white/[0.09] bg-black/25 px-2 py-0.5 text-[10px] font-bold text-white/70"
              >
                <span aria-hidden>{prize.medal}</span>
                {prize.days > 0 ? `${prize.days} hari` : "—"}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Toggle periode */}
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-1">
        {[
          { key: "weekly" as Period, label: "Mingguan", Icon: FiZap },
          { key: "monthly" as Period, label: "Bulanan", Icon: FiTrendingUp },
        ].map((item) => {
          const aktif = period === item.key;
          const Icon = item.Icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setPeriod(item.key)}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-black uppercase tracking-[0.1em] transition ${
                aktif
                  ? "bg-gradient-to-r from-cyan-500/25 to-violet-500/20 text-white shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)]"
                  : "text-white/35 hover:text-white/60"
              }`}
            >
              <Icon size={12} className={aktif ? "text-cyan-300" : ""} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Posisi kamu */}
      {user && standing && (
        <section
          className="rounded-2xl px-3 py-3"
          style={{
            background: "rgba(34,211,238,0.07)",
            border: "1px solid rgba(34,211,238,0.25)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300">
              <FiUser size={13} />
            </span>
            <p className="flex-1 text-[11px] font-black uppercase tracking-[0.12em] text-cyan-200">
              Posisi kamu
            </p>
            <span className="text-[10px] font-semibold text-white/40">
              {standing.total_players} peserta
            </span>
          </div>

          <div className="mt-2.5 flex items-end gap-4">
            <div>
              <p className="text-xl font-black leading-none text-white">
                {standing.rank ? `#${standing.rank}` : "—"}
              </p>
              <p className="mt-0.5 text-[9px] uppercase tracking-widest text-white/35">Peringkat</p>
            </div>
            <div>
              <p className="text-xl font-black leading-none text-cyan-300">
                {standing.chapters.toLocaleString("id-ID")}
              </p>
              <p className="mt-0.5 text-[9px] uppercase tracking-widest text-white/35">Chapter</p>
            </div>
            {gapToTop3 !== null && (
              <p className="ml-auto flex items-center gap-1 text-right text-[10px] leading-tight text-white/55">
                <FiTarget size={12} className="shrink-0 text-amber-300" />
                <span>
                  Kurang <span className="font-bold text-amber-300">{gapToTop3}</span> ch
                  <br />
                  untuk top 3
                </span>
              </p>
            )}
          </div>
        </section>
      )}

      {/* Board */}
      {loading ? (
        <BoardSkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center">
          <p className="text-[12px] font-semibold text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-white/20"
          >
            <FiRefreshCw size={11} /> Coba lagi
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center">
          <RiTrophyFill size={26} className="mx-auto mb-2 text-white/15" />
          <p className="text-[12px] font-bold text-white/70">Belum ada peserta</p>
          <p className="mx-auto mt-1 max-w-[240px] text-[10px] leading-relaxed text-white/35">
            Jadilah yang pertama — baca chapter apa saja untuk masuk papan peringkat.
          </p>
          <Link
            href="/terbaru"
            className="mt-3 inline-block rounded-xl bg-[var(--accent)] px-4 py-2 text-[11px] font-black text-white"
          >
            Mulai baca
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2">
            {podium.map((row, index) => (
              <PodiumCard key={row.user_id} row={row} index={index} />
            ))}
          </div>

          {rest.length > 0 && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.08]" />
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">
                  Peringkat lainnya
                </span>
                <div className="h-px flex-1 bg-white/[0.08]" />
              </div>
              <div className="flex flex-col gap-1.5">
                {rest.map((row) => (
                  <RankRow
                    key={row.user_id}
                    row={row}
                    maxChapters={maxChapters}
                    isSelf={row.user_id === user?.id}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <p className="pb-2 text-center text-[9px] leading-relaxed text-white/25">
        Chapter yang sama tidak dihitung dua kali dalam satu periode. Pemenang ditetapkan otomatis
        saat periode selesai dan hadiah diberikan admin maksimal 1×24 jam.
      </p>
    </div>
  );
}
