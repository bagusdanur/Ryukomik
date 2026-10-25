"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import UserBadges from "@/components/UserBadges";
import RankTierBadge, { tierForLevel } from "@/components/RankTierBadge";
import { RiFlashlightFill, RiTrophyFill } from "react-icons/ri";
import { FiBookOpen, FiRefreshCw, FiUsers, FiZap } from "react-icons/fi";
import { FaCrown } from "react-icons/fa";

type LeaderboardUser = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  is_premium?: boolean | null;
  role?: string | null;
  xp?: number | null;
  level?: number | null;
  total_reads?: number | null;
  total_comments?: number | null;
  title_rush_rank?: number | null;
  rank?: number | null;
};

type LeaderboardData = { xp: LeaderboardUser[]; reads: LeaderboardUser[] };
type Kategori = "xp" | "reads";

const KATEGORI: {
  key: Kategori;
  label: string;
  satuan: string;
  Icon: typeof FiZap;
}[] = [
  { key: "xp", label: "XP", satuan: "XP", Icon: FiZap },
  { key: "reads", label: "Chapter", satuan: "ch", Icon: FiBookOpen },
];

function nilaiMetrik(user: LeaderboardUser, kategori: Kategori) {
  if (kategori === "reads") return Math.max(0, Number(user.total_reads) || 0);
  return Math.max(0, Number(user.xp) || 0);
}

function xpForLevel(level: number) {
  return level * 500;
}

function XpBar({ xp, level, tone = "#8b5cf6" }: { xp: number; level: number; tone?: string }) {
  const lv = level || 1;
  const prev = xpForLevel(lv - 1);
  const next = xpForLevel(lv);
  const span = Math.max(1, next - prev);
  const pct = Math.min(100, Math.max(0, ((xp - prev) / span) * 100));
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone }} />
    </div>
  );
}

const MEDALS = [
  { ring: "#fbbf24", glow: "rgba(251,191,36,0.14)", card: "rgba(251,191,36,0.05)", border: "rgba(251,191,36,0.28)" },
  { ring: "#cbd5e1", glow: "rgba(203,213,225,0.12)", card: "rgba(203,213,225,0.04)", border: "rgba(203,213,225,0.22)" },
  { ring: "#f0883e", glow: "rgba(240,136,62,0.12)", card: "rgba(240,136,62,0.04)", border: "rgba(240,136,62,0.22)" },
];

const TIER_RING: Record<string, string> = {
  Legend: "#e879f9",
  Elite: "#a78bfa",
  Veteran: "#38bdf8",
  Pro: "#34d399",
  Reader: "#94a3b8",
};

function getProfileHref(username?: string | null) {
  return username ? `/u/${encodeURIComponent(username)}` : "#";
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
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span className="font-black uppercase text-white/40" style={{ fontSize: size * 0.36 }}>
          {name.charAt(0)}
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

/* ─── Podium (top 3) ─── */
function PodiumCard({
  user,
  index,
  isSelf,
  kategori,
}: {
  user: LeaderboardUser;
  index: number;
  isSelf: boolean;
  kategori: Kategori;
}) {
  const name = user.username || `User_${user.id?.slice(0, 4)}`;
  const medal = MEDALS[index] ?? MEDALS[2];
  const tierColor = TIER_RING[tierForLevel(user.level)?.label ?? ""] ?? medal.ring;
  const metric = nilaiMetrik(user, kategori);
  const satuan = KATEGORI.find((k) => k.key === kategori)?.satuan ?? "";

  return (
    <div
      className={`relative flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-2xl px-2 pb-3 pt-4 ${
        index === 0 ? "-mt-3 pb-4" : ""
      }`}
      style={{
        background: isSelf ? "rgba(34,211,238,0.10)" : medal.card,
        border: `1px solid ${isSelf ? "rgba(34,211,238,0.35)" : medal.border}`,
        boxShadow: index === 0 ? `0 8px 24px -12px ${medal.glow}` : undefined,
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
        className=" flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-black"
        style={{ background: medal.ring }}
      >
        {index + 1}
      </span>

      <Link href={getProfileHref(user.username)} className="rounded-full">
        <Avatar url={user.avatar_url} name={name} size={index === 0 ? 52 : 44} ring={tierColor} />
      </Link>

      <Link
        href={getProfileHref(user.username)}
        className="w-full truncate text-center text-[11px] font-bold leading-tight transition-colors hover:text-cyan-200"
        style={{ color: isSelf ? "#67e8f9" : "#fff" }}
      >
        {name}
      </Link>

      <div className="flex flex-wrap items-center justify-center gap-1">
        <UserBadges
          role={user.role}
          isPremium={user.is_premium}
          titleRushRank={user.title_rush_rank}
          xpRank={kategori === "xp" ? user.rank || index + 1 : null}
          totalReads={user.total_reads}
          className="text-[8px]"
        />
        <RankTierBadge level={user.level} />
        {isSelf && <SelfTag />}
      </div>

      <div className="mt-0.5 flex items-baseline gap-0.5">
        <span className="text-[15px] font-black leading-none text-white">
          {metric.toLocaleString("id-ID")}
        </span>
        <span className="text-[9px] font-bold text-white/35">{satuan}</span>
      </div>

      <span className="text-[9px] font-bold" style={{ color: tierColor }}>
        Lv.{user.level || 1}
      </span>
      <div className="w-full px-0.5">
        <XpBar xp={user.xp || 0} level={user.level || 1} tone={tierColor} />
      </div>
    </div>
  );
}

/* ─── Baris peringkat 4+ ─── */
function RankRow({
  user,
  rank,
  isSelf,
  kategori,
  maxMetric,
}: {
  user: LeaderboardUser;
  rank: number;
  isSelf: boolean;
  kategori: Kategori;
  maxMetric: number;
}) {
  const name = user.username || `User_${user.id?.slice(0, 4)}`;
  const metric = nilaiMetrik(user, kategori);
  const satuan = KATEGORI.find((k) => k.key === kategori)?.satuan ?? "";
  const tier = tierForLevel(user.level);
  const tierColor = TIER_RING[tier?.label ?? ""] ?? "rgba(255,255,255,0.16)";
  const relative = maxMetric > 0 ? Math.max(3, Math.round((metric / maxMetric) * 100)) : 0;

  return (
    <div
      className="flex items-center gap-2.5 rounded-2xl px-2.5 py-2.5 transition-colors"
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
        {rank}
      </span>

      <Link href={getProfileHref(user.username)} className="rounded-full">
        <Avatar url={user.avatar_url} name={name} size={38} ring={tierColor} />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1">
          <Link
            href={getProfileHref(user.username)}
            className="max-w-[120px] truncate text-[12px] font-bold transition-colors hover:text-cyan-200"
            style={{ color: isSelf ? "#67e8f9" : "#fff" }}
          >
            {name}
          </Link>
          {isSelf && <SelfTag />}
          <UserBadges
            role={user.role}
            isPremium={user.is_premium}
            titleRushRank={user.title_rush_rank}
            xpRank={kategori === "xp" ? user.rank || rank : null}
            totalReads={user.total_reads}
            className="text-[8px]"
          />
          <RankTierBadge level={user.level} />
        </div>

        <div className="mt-1 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${relative}%`,
                background: `linear-gradient(90deg, ${tierColor}, ${tierColor}66)`,
              }}
            />
          </div>
          <span className="shrink-0 text-[9px] font-bold text-white/35">Lv.{user.level || 1}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[13px] font-black leading-none text-white">
          {metric.toLocaleString("id-ID")}
        </p>
        <p className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-white/25">
          {satuan}
        </p>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-20">
      <div className="mx-auto mb-4 h-14 w-14 animate-pulse rounded-2xl bg-white/[0.05]" />
      <div className="mx-auto mb-6 h-4 w-40 animate-pulse rounded-full bg-white/[0.05]" />
      <div className="mb-5 flex gap-2">
        <div className="h-9 flex-1 animate-pulse rounded-xl bg-white/[0.05]" />
        <div className="h-9 flex-1 animate-pulse rounded-xl bg-white/[0.05]" />
      </div>
      <div className="mb-5 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 flex-1 animate-pulse rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/[0.03]" />
        ))}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [kategori, setKategori] = useState<Kategori>("xp");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useSupabaseUser();
  const currentUserId = user?.id || null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/leaderboard", { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error("Server sedang sibuk.");
      const json = (await response.json()) as LeaderboardData;
      setData(json && typeof json === "object" && Array.isArray(json.xp) ? json : null);
    } catch (cause) {
      const timedOut =
        cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError");
      setError(timedOut ? "Server timeout. Coba lagi." : "Gagal memuat leaderboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <div className="rk-page text-white"><Skeleton /></div>;

  if (error) {
    return (
      <div className="rk-page flex min-h-screen items-center justify-center px-6 text-white">
        <div className="flex flex-col items-center gap-3 text-center">
          <RiTrophyFill size={30} className="text-white/20" />
          <p className="text-[12px] font-semibold text-white/60">{error}</p>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-[11px] font-bold text-white/80"
          >
            <FiRefreshCw size={12} /> Coba lagi
          </button>
        </div>
      </div>
    );
  }

  const users = data?.[kategori] || [];
  const top3 = users.slice(0, 3);
  const rest = users.slice(3);
  const maxMetric = nilaiMetrik(users[0] || { id: "" }, kategori);
  const activeKategori = KATEGORI.find((k) => k.key === kategori)!;

  return (
    <div className="rk-page text-white">
      <div className="mx-auto max-w-lg px-4 pb-24 pt-20">
        {/* Header */}
        <div className="pb-5 pt-8 text-center">
          <div className="relative mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/25 to-orange-600/10 shadow-[0_6px_24px_-10px_rgba(251,191,36,0.6)]">
            <RiTrophyFill size={26} className="text-amber-300" />
            <RiFlashlightFill
              size={12}
              className="absolute -right-1 -top-1 text-amber-200"
            />
          </div>
          <h1 className="text-xl font-black uppercase tracking-[0.14em] text-white">Leaderboard</h1>
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1">
            <FiUsers size={10} className="text-white/30" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
              {users.length} pembaca aktif
            </span>
          </div>
        </div>

        {/* Promo marathon */}
        <Link
          href="/marathon"
          className="mb-4 flex items-center gap-2.5 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2.5 transition hover:border-amber-400/40 hover:bg-amber-400/10"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-amber-950">
            <RiFlashlightFill size={15} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-black text-white">Event Speedrun Baca</span>
            <span className="block truncate text-[9px] text-white/45">
              Peringkat mingguan & bulanan — juara 1-3 dapat premium
            </span>
          </span>
          <span className="shrink-0 text-[10px] font-bold text-amber-300">Ikuti →</span>
        </Link>

        {/* Tab kategori */}
        <div className="mb-5 grid grid-cols-2 gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-1">
          {KATEGORI.map((k) => {
            const aktif = k.key === kategori;
            const Icon = k.Icon;
            return (
              <button
                key={k.key}
                onClick={() => setKategori(k.key)}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition ${
                  aktif
                    ? "bg-gradient-to-r from-cyan-500/25 to-violet-500/20 text-white shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)]"
                    : "text-white/35 hover:text-white/60"
                }`}
              >
                <Icon size={12} className={aktif ? "text-cyan-300" : ""} />
                {k.label}
              </button>
            );
          })}
        </div>

        {users.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center">
            <RiTrophyFill size={26} className="mx-auto mb-2 text-white/15" />
            <p className="text-[11px] text-white/35">Belum ada data peringkat.</p>
          </div>
        )}

        {/* Podium */}
        {top3.length > 0 && (
          <div className="mb-5 flex items-start gap-2">
            {top3.map((u, i) => (
              <PodiumCard
                key={u.id}
                user={u}
                index={i}
                isSelf={u.id === currentUserId}
                kategori={kategori}
              />
            ))}
          </div>
        )}

        {/* Divider */}
        {rest.length > 0 && (
          <div className="mb-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.08]" />
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">
              Peringkat lainnya
            </span>
            <div className="h-px flex-1 bg-white/[0.08]" />
          </div>
        )}

        {/* Rest */}
        <div className="flex flex-col gap-1.5">
          {rest.map((u, i) => (
            <RankRow
              key={u.id}
              user={u}
              rank={i + 4}
              isSelf={u.id === currentUserId}
              kategori={kategori}
              maxMetric={maxMetric}
            />
          ))}
        </div>

        {users.length > 0 && (
          <p className="mt-5 text-center text-[9px] text-white/20">
            Diurutkan berdasarkan {activeKategori.label} · {activeKategori.satuan}
          </p>
        )}
      </div>
    </div>
  );
}
