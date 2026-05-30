"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import UserBadges from "@/components/UserBadges";
import { RiTrophyFill } from "react-icons/ri";
import { HiSparkles } from "react-icons/hi2";

type LeaderboardUser = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  is_premium?: boolean | null;
  role?: string | null;
  xp?: number | null;
  level?: number | null;
  title_rush_rank?: number | null;
  xp_rank?: number | null;
};

type AvatarProps = {
  url?: string | null;
  name?: string;
  size: number;
  borderColor?: string;
};

function xpForLevel(level: number): number {
  return level * 500;
}

function XpBar({ xp, level }: { xp: number; level: number }) {
  const prev = xpForLevel((level || 1) - 1);
  const next = xpForLevel(level || 1);
  const pct = Math.min(((xp - prev) / (next - prev)) * 100, 100);
  return (
      <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
      <div className="h-full rounded-full"
        style={{ width: `${pct}%`, background: "#8b5cf6" }} />
    </div>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];
const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const MEDAL_BG = [
  "#181200",
  "#151515",
  "#160f09",
];
const MEDAL_BORDER = ["#FFD70035", "#C0C0C025", "#CD7F3225"];

function Avatar({ url, name, size, borderColor }: AvatarProps) {
  return (
    <div className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
      style={{
        width: size, height: size,
        background: "#1c1c1c",
        border: `2px solid ${borderColor || "rgba(255,255,255,0.07)"}`,
      }}>
      {url
        ? <img src={url} className="w-full h-full object-cover" alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        : <span className="text-white/40 uppercase font-black" style={{ fontSize: size * 0.35 }}>{name?.charAt(0)}</span>
      }
    </div>
  );
}

function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "admin";
}) {
  const className =
    variant === "admin"
        ? "border-[var(--accent-3)]/25 bg-[var(--accent-3)]/12 text-[var(--accent-3)]"
        : "border-[var(--accent-2)]/25 bg-[var(--accent-2)]/12 text-[var(--accent-2)]";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest leading-none ${className}`}>
      {children}
    </span>
  );
}

function getProfileHref(username?: string | null): string {
  return username ? `/u/${encodeURIComponent(username)}` : "#";
}

/* ─── Podium Card (top 3) ─── */
function PodiumCard({
  user,
  index,
  isSelf,
}: {
  user: LeaderboardUser;
  index: number;
  isSelf: boolean;
}) {
  const name = user.username || `User_${user.id?.slice(0, 4)}`;
  const mc = MEDAL_COLORS[index];
  return (
    <div className="flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl"
      style={{
        background: isSelf ? "rgba(34,211,238,0.12)" : MEDAL_BG[index],
        border: `1px solid ${isSelf ? "rgba(34,211,238,0.35)" : MEDAL_BORDER[index]}`,
        minWidth: 0,
      }}>
      <span className="text-2xl leading-none">{MEDALS[index]}</span>
      <Link href={getProfileHref(user.username)} className="rounded-full">
        <Avatar url={user.avatar_url} name={name} size={44}
          borderColor={isSelf ? "rgba(125,95,255,0.5)" : mc + "55"} />
      </Link>

      {/* Name */}
      <Link
        href={getProfileHref(user.username)}
        className="w-full truncate text-center text-[11px] font-bold leading-tight hover:text-cyan-200"
        style={{ color: isSelf ? "#a78bfa" : "#fff", maxWidth: 80 }}>
        {name}
      </Link>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 justify-center">
        <UserBadges
          role={user.role}
          isPremium={user.is_premium}
          titleRushRank={user.title_rush_rank}
          xpRank={user.xp_rank || index + 1}
          className="text-[8px]"
        />
        {isSelf && <Badge>KAMU</Badge>}
      </div>

      {/* Level */}
      <span className="text-[9px] font-black" style={{ color: mc }}>Lv.{user.level || 1}</span>

      {/* XP bar */}
      <div className="w-full"><XpBar xp={user.xp || 0} level={user.level || 1} /></div>

      {/* XP number */}
      <p className="text-[11px] font-black text-white leading-none">
        {(user.xp || 0).toLocaleString()}
        <span className="text-white/25 font-normal text-[9px] ml-0.5">XP</span>
      </p>

      {/* Reads */}
      <div className="flex items-center gap-1 text-white/30">
      </div>
    </div>
  );
}

/* ─── Rank Row (4+) ─── */
function RankRow({
  user,
  index,
  isSelf,
}: {
  user: LeaderboardUser;
  index: number;
  isSelf: boolean;
}) {
  const name = user.username || `User_${user.id?.slice(0, 4)}`;
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{
        background: isSelf ? "rgba(125,95,255,0.09)" : "rgba(255,255,255,0.025)",
        border: isSelf ? "1px solid rgba(125,95,255,0.25)" : "1px solid rgba(255,255,255,0.05)",
      }}>

      {/* Rank */}
      <span className="text-xs font-black text-white/20 w-5 text-center flex-shrink-0">
        {index + 1}
      </span>

      <Link href={getProfileHref(user.username)} className="rounded-full">
        <Avatar url={user.avatar_url} name={name} size={36}
          borderColor={isSelf ? "rgba(125,95,255,0.4)" : undefined} />
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <Link
            href={getProfileHref(user.username)}
            className="truncate text-[12px] font-bold hover:text-cyan-200"
            style={{ color: isSelf ? "#a78bfa" : "#fff", maxWidth: 110 }}>
            {name}
          </Link>
          {isSelf && <Badge>KAMU</Badge>}
          <UserBadges
            role={user.role}
            isPremium={user.is_premium}
            titleRushRank={user.title_rush_rank}
            xpRank={user.xp_rank || index + 1}
            className="text-[8px]"
          />
        </div>
        <XpBar xp={user.xp || 0} level={user.level || 1} />
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] font-bold" style={{ color: "#7d5fff" }}>Lv.{user.level || 1}</span>
          <span className="text-white/15">·</span>
        </div>
      </div>

      {/* XP */}
      <div className="text-right flex-shrink-0">
        <p className="text-[13px] font-black text-white leading-none">{(user.xp || 0).toLocaleString()}</p>
        <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest mt-0.5">XP</p>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data?.user?.id || null));
    fetch("/api/leaderboard")
      .then(r => r.json())
      .then((d: LeaderboardUser[]) => { setUsers(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#161616" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-white/30 text-[10px] tracking-widest uppercase">Memuat...</p>
        </div>
      </div>
    );

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  return (
    <div className="rk-page text-white">
      <div className="mx-auto max-w-lg px-4 pb-24 pt-20">

        {/* ── Header ── */}
        <div className="pt-8 pb-5 text-center">
          {/* Icon + Title */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <RiTrophyFill size={22} style={{ color: "#FFD700" }} />
            <h1 className="text-xl font-black uppercase tracking-wider"
              style={{
                color: "#22d3ee",
              }}>
              Leaderboard
            </h1>
            <RiTrophyFill size={22} style={{ color: "#FFD700" }} />
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <HiSparkles size={10} className="text-white/20" />
            <p className="text-[10px] text-white/25 tracking-[2.5px] uppercase font-medium">
              Para pembaca paling aktif
            </p>
            <HiSparkles size={10} className="text-white/20" />
          </div>
        </div>

        {/* ── Podium top 3 ── */}
        {top3.length > 0 && (
          <div className="flex gap-2 mb-5">
            {top3.map((u, i) => (
              <PodiumCard key={u.id} user={u} index={i} isSelf={u.id === currentUserId} />
            ))}
          </div>
        )}

        {/* ── Divider ── */}
        {rest.length > 0 && (
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[9px] text-white/20 tracking-[2px] uppercase font-bold">Peringkat lainnya</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        )}

        {/* ── Rest ── */}
        <div className="flex flex-col gap-1.5">
          {rest.map((u, i) => (
            <RankRow key={u.id} user={u} index={i + 3} isSelf={u.id === currentUserId} />
          ))}
        </div>

      </div>
    </div>
  );
}
