"use client";

import {
  FiActivity,
  FiBookOpen,
  FiCheck,
  FiRefreshCw,
  FiUsers,
  FiMessageCircle,
  FiAward,
  FiSmartphone,
} from "react-icons/fi";
import { RiVipCrownLine } from "react-icons/ri";
import { HiOutlineSparkles } from "react-icons/hi2";
import { MdOutlinePeople } from "react-icons/md";
import DashboardOnlineCounter from "./DashboardOnlineCounter";
import type { ReactNode } from "react";

type AdminUser = {
  username?: string;
  avatar_url?: string;
};

type DashboardStats = {
  totalUsers: number;
  premiumUsers: number;
  totalComments: number;
  commentsToday: number;
  readsToday: number;
  totalReads: number;
};

type ActivityToday = {
  topChapters: Array<{ slug: string; count: number }>;
  topUsers: Array<{
    userId: string;
    count: number;
    profile?: { username?: string | null } | null;
  }>;
};

type DashboardHomeTabProps = {
  adminUser?: AdminUser | null;
  stats: DashboardStats;
  activityToday: ActivityToday;
  activityLoading: boolean;
  fetchActivityToday: () => void;
  pendingCount: number;
  setPage: (page: string) => void;
  setFilter: (filter: string) => void;
};

type AvatarProps = {
  name?: string;
  url?: string;
  size?: number;
};

type StatCardProps = {
  icon: ReactNode;
  badge: ReactNode;
  value: ReactNode;
  label: string;
  detail?: ReactNode;
};

function titleCaseFromSlug(text = "") {
  return text
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatChapterActivity(slug = "") {
  const cleanSlug = String(slug).split("?")[0].replace(/^\/+|\/+$/g, "");
  const lastPart = cleanSlug.split("/").filter(Boolean).pop() || cleanSlug;
  const match =
    lastPart.match(/(.+?)-chapter-([\w.]+)$/i) ||
    lastPart.match(/(.+?)\/chapter-([\w.]+)$/i);

  if (!match) {
    return {
      title: titleCaseFromSlug(lastPart) || "Chapter tidak diketahui",
      chapter: "",
    };
  }

  return {
    title: titleCaseFromSlug(match[1]),
    chapter: `Ch. ${match[2]}`,
  };
}

function Avatar({ name = "", url = "", size = 36 }: AvatarProps) {
  const initials = name?.slice(0, 2)?.toUpperCase() || "??";
  const colors = [
    "bg-violet-500",
    "bg-amber-500",
    "bg-teal-500",
    "bg-pink-500",
    "bg-blue-500",
  ];
  const color = colors[name?.charCodeAt(0) % colors.length] || colors[0];

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      className={`${color} rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

function StatCard({ icon, badge, value, label, detail }: StatCardProps) {
  return (
    <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        {icon}
        {badge}
      </div>
      <p
        className="text-2xl font-bold"
        style={{ fontFamily: "Space Mono, monospace" }}
      >
        {value}
      </p>
      <p className="text-[11px] text-white/30 mt-0.5">{label}</p>
      {detail && <p className="text-[10px] text-white/20 mt-1">{detail}</p>}
    </div>
  );
}

export default function DashboardHomeTab({
  adminUser,
  stats,
  activityToday,
  activityLoading,
  fetchActivityToday,
  pendingCount,
  setPage,
  setFilter,
}: DashboardHomeTabProps) {
  return (
    <>
      <div className="flex items-center gap-3 mb-1">
        <Avatar
          name={adminUser?.username || "Admin"}
          url={adminUser?.avatar_url}
          size={40}
        />
        <div>
          <p className="text-[13px] font-bold text-white">
            Halo, {adminUser?.username ?? "Admin"}
          </p>
          <p className="text-[11px] text-white/30">
            Selamat datang kembali
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <MdOutlinePeople size={18} className="text-violet-400" />
            </div>
          }
          badge={
            <span className="text-[10px] font-semibold bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">
              Total
            </span>
          }
          value={stats.totalUsers.toLocaleString("id-ID")}
          label="Total User"
        />

        <StatCard
          icon={
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <RiVipCrownLine size={17} className="text-amber-400" />
            </div>
          }
          badge={
            <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">
              Premium
            </span>
          }
          value={stats.premiumUsers.toLocaleString("id-ID")}
          label="User Premium"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DashboardOnlineCounter />
        <StatCard
          icon={
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <FiMessageCircle size={17} className="text-cyan-300" />
            </div>
          }
          badge={
            <span className="text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded-full">
              Total
            </span>
          }
          value={stats.totalComments.toLocaleString("id-ID")}
          label="Total Komentar"
          detail="Semua komentar tersimpan"
        />
        <StatCard
          icon={
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <FiMessageCircle size={17} className="text-indigo-400" />
            </div>
          }
          badge={
            <span className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full">
              Hari ini
            </span>
          }
          value={stats.commentsToday.toLocaleString("id-ID")}
          label="Komentar Hari Ini"
          detail={`Total: ${stats.totalComments.toLocaleString("id-ID")}`}
        />
        <StatCard
          icon={
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center">
              <FiBookOpen size={17} className="text-teal-400" />
            </div>
          }
          badge={
            <span className="text-[10px] font-semibold bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded-full">
              Hari ini
            </span>
          }
          value={stats.readsToday.toLocaleString("id-ID")}
          label="Chapter Dibaca"
          detail={`Total: ${stats.totalReads.toLocaleString("id-ID")}`}
        />
      </div>

      <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-semibold text-white/60 flex items-center gap-1.5">
            <HiOutlineSparkles size={13} className="text-amber-400" />
            Rasio Premium
          </p>
          <p className="text-[12px] font-bold text-amber-400">
            {stats.totalUsers > 0
              ? ((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1)
              : "0"}
            %
          </p>
        </div>
        <div className="h-2 bg-white/[.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-700"
            style={{
              width:
                stats.totalUsers > 0
                  ? `${(stats.premiumUsers / stats.totalUsers) * 100}%`
                  : "0%",
            }}
          />
        </div>
        <p className="text-[10px] text-white/25 mt-1.5">
          {stats.premiumUsers} dari {stats.totalUsers} user berlangganan premium
        </p>
      </div>

      <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[12px] font-semibold text-white/70">
              Aktivitas Hari Ini
            </p>
            <p className="text-[10px] text-white/30">
              Chapter paling dibaca dan pembaca teraktif
            </p>
          </div>
          <button
            onClick={fetchActivityToday}
            disabled={activityLoading}
            className="w-8 h-8 rounded-lg bg-white/[.05] border border-white/[.08] flex items-center justify-center text-white/40 hover:text-white transition-colors"
          >
            <FiRefreshCw
              size={13}
              className={activityLoading ? "animate-spin" : ""}
            />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <p className="text-[10px] uppercase font-semibold text-white/25">
              Top Chapter
            </p>
            {activityToday.topChapters.length > 0 ? (
              activityToday.topChapters.map((item) => {
                const chapter = formatChapterActivity(item.slug);
                return (
                  <div
                    key={item.slug}
                    title={item.slug}
                    className="rounded-xl bg-white/[.04] px-3 py-2"
                  >
                    <p className="text-[11px] text-white/65 truncate">
                      {chapter.title}
                    </p>
                    <p className="text-[10px] text-white/25">
                      {chapter.chapter ? `${chapter.chapter} - ` : ""}
                      {item.count} baca
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-[11px] text-white/25">Belum ada data</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[10px] uppercase font-semibold text-white/25">
              Pembaca Teraktif
            </p>
            {activityToday.topUsers.length > 0 ? (
              activityToday.topUsers.map((item) => (
                <div
                  key={item.userId}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white/[.04] px-3 py-2"
                >
                  <span className="min-w-0 truncate text-[11px] text-white/65">
                    {item.profile?.username || "User"}
                  </span>
                  <span className="shrink-0 text-[10px] text-white/30">
                    {item.count} baca
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-white/25">Belum ada data</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest mb-2.5">
          Akses Cepat
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPage("comments")}
            className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4 flex items-center gap-3 hover:border-cyan-500/30 hover:bg-cyan-500/[.04] transition-all text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <FiMessageCircle size={16} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white/70">
                Komentar
              </p>
              <p className="text-[10px] text-white/30">
                Moderasi diskusi
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              setPage("users");
              setFilter("all");
            }}
            className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4 flex items-center gap-3 hover:border-violet-500/30 hover:bg-violet-500/[.04] transition-all text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <FiUsers size={16} className="text-violet-400" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white/70">
                Kelola User
              </p>
              <p className="text-[10px] text-white/30">
                {stats.totalUsers} terdaftar
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              setPage("users");
              setFilter("premium");
            }}
            className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4 flex items-center gap-3 hover:border-amber-500/30 hover:bg-amber-500/[.04] transition-all text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <RiVipCrownLine size={16} className="text-amber-400" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white/70">
                User Premium
              </p>
              <p className="text-[10px] text-white/30">
                {stats.premiumUsers} aktif
              </p>
            </div>
          </button>

          <button
            onClick={() => setPage("codes")}
            className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4 flex items-center gap-3 hover:border-[#7c5cfc]/30 hover:bg-[#7c5cfc]/[.04] transition-all text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-[#7c5cfc]/10 flex items-center justify-center">
              <HiOutlineSparkles size={16} className="text-[#7c5cfc]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white/70">
                Kode Prem
              </p>
              <p className="text-[10px] text-white/30">Generate & kelola</p>
            </div>
          </button>

          <button
            onClick={() => setPage("requests")}
            className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4 flex items-center gap-3 hover:border-teal-500/30 hover:bg-teal-500/[.04] transition-all text-left relative"
          >
            {pendingCount > 0 && (
              <span className="absolute top-3 right-3 w-5 h-5 bg-[#7c5cfc] rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                {pendingCount}
              </span>
            )}
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center">
              <FiCheck size={16} className="text-teal-400" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white/70">
                Bukti Bayar
              </p>
              <p className="text-[10px] text-white/30">
                {pendingCount > 0 ? `${pendingCount} menunggu` : "Semua clear"}
              </p>
            </div>
          </button>

          <button
            onClick={() => setPage("source-health")}
            className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4 flex items-center gap-3 hover:border-sky-500/30 hover:bg-sky-500/[.04] transition-all text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <FiActivity size={16} className="text-sky-400" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white/70">
                Source Health
              </p>
              <p className="text-[10px] text-white/30">Cek latency & error</p>
            </div>
          </button>

          <button
            onClick={() => setPage("events")}
            className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4 flex items-center gap-3 hover:border-cyan-500/30 hover:bg-cyan-500/[.04] transition-all text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <FiAward size={16} className="text-cyan-300" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white/70">
                Hadiah Event
              </p>
              <p className="text-[10px] text-white/30">Title Rush mingguan</p>
            </div>
          </button>

          <button
            onClick={() => setPage("apk")}
            className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4 flex items-center gap-3 hover:border-emerald-500/30 hover:bg-emerald-500/[.04] transition-all text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <FiSmartphone size={16} className="text-emerald-300" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white/70">
                Setting APK
              </p>
              <p className="text-[10px] text-white/30">URL, versi & log</p>
            </div>
          </button>

          <button
            onClick={() => setPage("yuki-ai")}
            className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4 flex items-center gap-3 hover:border-violet-500/30 hover:bg-violet-500/[.04] transition-all text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <HiOutlineSparkles size={16} className="text-violet-400" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white/70">
                Yuki AI
              </p>
              <p className="text-[10px] text-white/30">Matikan / aktifkan widget</p>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
