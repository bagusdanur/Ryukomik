"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiRefreshCw, FiUser } from "react-icons/fi";
import { RiTrophyFill } from "react-icons/ri";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { supabase } from "@/lib/supabaseClient";

type Period = "weekly" | "monthly";

type LeaderboardRow = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  level: number | null;
  is_premium: boolean | null;
  chapters: number;
  rank: number;
};

type EventInfo = {
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  prize1: string | null;
  prize2: string | null;
  prize3: string | null;
};

type Standing = {
  chapters: number;
  rank: number | null;
  total_players: number;
  third_chapters: number | null;
};

const MEDALS = ["🥇", "🥈", "🥉"];

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
  if (days > 0) return `${days}h ${hours}j ${minutes}m`;
  if (hours > 0) return `${hours}j ${minutes}m`;
  return `${minutes}m`;
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
  const endsAt = useMemo(
    () => (event?.endsAt ? new Date(event.endsAt) : periodEnd(period, new Date(now))),
    [event?.endsAt, period, now],
  );

  const gapToTop3 =
    standing && standing.third_chapters !== null && standing.rank !== null && standing.rank > 3
      ? Math.max(0, standing.third_chapters - standing.chapters + 1)
      : null;

  return (
    <div className="space-y-5">
      {/* Event header */}
      <section className="rk-card rounded-3xl p-5 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-300/70">
          Event Ryukomik
        </p>
        <h1 className="mt-1 text-2xl font-black text-white">
          {event?.title || "Marathon Baca"}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/55">
          {event?.description ||
            "Baca sebanyak mungkin chapter tiap minggu & bulan. Juara 1-3 dapat hadiah premium."}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-white/70">
          ⏳ Periode berakhir dalam <span className="text-cyan-300">{countdown(endsAt, now)}</span>
        </div>
      </section>

      {/* Period toggle */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[.07] bg-white/[0.03] p-1">
        {(
          [
            { key: "weekly" as Period, label: "Mingguan" },
            { key: "monthly" as Period, label: "Bulanan" },
          ]
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setPeriod(item.key)}
            className={`rounded-xl py-2.5 text-sm font-bold transition ${
              period === item.key
                ? "bg-[var(--accent)]/15 text-cyan-200 border border-cyan-400/30"
                : "text-white/45 hover:text-white/70 border border-transparent"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* My standing */}
      {user && standing && (
        <section className="rounded-2xl border border-white/10 bg-[#12141e] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <FiUser className="text-cyan-300" /> Posisi kamu
            </div>
            <span className="text-xs text-white/45">
              {standing.total_players} peserta
            </span>
          </div>
          <div className="mt-3 flex items-end gap-4">
            <div>
              <p className="text-2xl font-black text-white">
                {standing.rank ? `#${standing.rank}` : "—"}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-white/35">Peringkat</p>
            </div>
            <div>
              <p className="text-2xl font-black text-cyan-300">{standing.chapters}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/35">Chapter</p>
            </div>
            {gapToTop3 !== null && (
              <p className="ml-auto text-right text-[11px] leading-tight text-white/55">
                Kurang <span className="font-bold text-amber-300">{gapToTop3}</span> chapter
                <br />
                untuk masuk top 3
              </p>
            )}
          </div>
        </section>
      )}

      {/* Loading / error / empty */}
      {loading ? (
        <div className="flex items-center justify-center py-14">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
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
        <div className="rounded-2xl border border-dashed border-white/10 py-14 text-center">
          <p className="text-3xl">🏃</p>
          <p className="mt-2 text-sm font-bold text-white/70">Belum ada peserta</p>
          <p className="mt-1 text-xs text-white/35">
            Jadilah yang pertama — baca chapter apa saja untuk masuk papan peringkat.
          </p>
          <Link
            href="/terbaru"
            className="mt-4 inline-block rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-black text-white"
          >
            Mulai baca
          </Link>
        </div>
      ) : (
        <>
          {/* Podium */}
          <section className="grid grid-cols-3 gap-2">
            {podium.map((row, index) => (
              <div
                key={row.user_id}
                className={`rounded-2xl border p-3 text-center ${
                  index === 0
                    ? "border-amber-400/30 bg-amber-400/[0.07]"
                    : "border-white/10 bg-[#12141e]"
                }`}
              >
                <p className="text-lg">{MEDALS[index]}</p>
                <div className="mx-auto mt-1 h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-white/5">
                  {row.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.avatar_url}
                      alt={row.username}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white/40">
                      {row.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="mt-1.5 truncate text-[11px] font-bold text-white">{row.username}</p>
                <p className="text-[10px] font-bold text-cyan-300">{row.chapters} ch</p>
              </div>
            ))}
          </section>

          {/* Rest of the board */}
          {rest.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-white/[.07] bg-[#10121a]">
              {rest.map((row) => (
                <div
                  key={row.user_id}
                  className="flex items-center gap-3 border-b border-white/[.05] px-3 py-2.5 last:border-b-0"
                >
                  <span className="w-6 shrink-0 text-center text-[11px] font-black text-white/35">
                    {row.rank}
                  </span>
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                    {row.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.avatar_url}
                        alt={row.username}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white/40">
                        {row.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white/85">
                    {row.username}
                  </p>
                  <span className="shrink-0 text-[11px] font-bold text-cyan-300">
                    {row.chapters} ch
                  </span>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      {/* Prizes */}
      <section className="rounded-2xl border border-white/[.07] bg-[#10121a] p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-black text-white">
          <RiTrophyFill className="text-amber-300" /> Hadiah Juara
        </p>
        <ul className="space-y-2">
          {[
            { medal: MEDALS[0], prize: event?.prize1 },
            { medal: MEDALS[1], prize: event?.prize2 },
            { medal: MEDALS[2], prize: event?.prize3 },
          ].map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-[12px] text-white/70">
              <span>{item.medal}</span>
              <span>{item.prize || "Hadiah menyusul"}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10px] leading-relaxed text-white/30">
          Pemenang ditetapkan otomatis setiap periode selesai dan hadiah diberikan admin maksimal 1×24 jam.
          Chapter yang sama tidak dihitung dua kali dalam satu periode.
        </p>
      </section>
    </div>
  );
}
