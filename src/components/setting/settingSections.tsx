import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import {
  FaChartBar,
  FaCrown,
  FaInfoCircle,
  FaPalette,
  FaQuestionCircle,
  FaShieldAlt,
  FaSignInAlt,
  FaSignOutAlt,
  FaSync,
  FaUserCircle,
  FaCamera,
  FaEye,
  FaPen,
} from "react-icons/fa";
import { CiExport, CiImport } from "react-icons/ci";
import OnlineCounter from "@/components/OnlineCounter";
import VipBadge from "@/components/VipBadge";
import {
  formatAutoSyncStatus,
  formatDate,
  formatPremiumDaysLeft,
  XP_PER_LEVEL,
} from "./settingsUtils";
import { RowLeft, Section, StatCard, ThemePreview } from "./settingUi";
import PushNotifToggle from "@/components/PushNotifToggle";

type Profile = {
  username?: string | null;
  avatar_url?: string | null;
  xp?: number;
  level?: number;
  total_reads?: number;
  is_premium?: boolean;
  created_at?: string | null;
  role?: string | null;
};

type PrivacySettings = Record<string, boolean | undefined>;

export function ProfileSection({
  isLogin,
  user,
  profile,
  onEditProfile,
}: {
  isLogin: boolean;
  user?: User | null;
  profile?: Profile | null;
  onEditProfile: () => void;
}) {
  const displayName = profile?.username || user?.user_metadata?.name || "User";
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <div className="rk-card relative overflow-hidden rounded-3xl px-5 py-8 text-center">
      <div className="absolute inset-x-10 top-0 h-px bg-white/10" />
      {isLogin ? (
        <div className="relative mx-auto h-24 w-24">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              className="rounded-full"
              width={96}
              height={96}
              alt="Avatar"
            />
          ) : (
            <span className="text-2xl font-black text-white/45">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
          </div>
          <button
            type="button"
            onClick={onEditProfile}
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[var(--surface-1)] text-cyan-200 shadow-lg shadow-black/30 transition hover:bg-white/10"
            aria-label="Edit foto profil"
            title="Edit foto profil"
          >
            <FaCamera className="text-xs" />
          </button>
        </div>
      ) : (
        <Image
          src="/icon.png?v=20260523"
          alt="App Logo"
          width={96}
          height={96}
          priority
          className="rounded-full border border-white/10"
        />
      )}
      <div className="mt-4 flex items-center justify-center gap-2">
        <h2 className="text-xl font-black">{isLogin ? displayName : "Guest"}</h2>
        {isLogin && (
          <button
            type="button"
            onClick={onEditProfile}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-cyan-200"
            aria-label="Edit profil"
            title="Edit profil"
          >
            <FaPen className="text-[11px]" />
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-white/45">
        {isLogin ? "Ryukomik member profile" : "Login untuk sinkronisasi data"}
      </p>
    </div>
  );
}

export function XpSection({ stats }: { stats: { xp: number; level: number } }) {
  const currentXP = stats.xp % XP_PER_LEVEL;

  return (
    <div className="mx-auto mt-6 w-full max-w-sm px-2">
      <div className="flex justify-between items-end mb-2">
        <span className="text-2xl font-black text-cyan-200 italic">
          LV. {stats.level}
        </span>
        <span className="text-[11px] text-white/50 font-medium">
          {currentXP} / {XP_PER_LEVEL} | Total: {stats.xp} XP
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full border border-white/10 bg-white/5 p-[2px]">
        <div
          className="h-full rounded-full bg-[var(--accent-2)]"
          style={{ width: `${Math.min((currentXP / XP_PER_LEVEL) * 100, 100)}%` }}
        />
      </div>
      <p className="text-[10px] text-white/30 mt-2 text-center italic">
        Dapatkan XP dengan cara membaca dan berkomentar!
      </p>
    </div>
  );
}

export function MyStatsSection({ stats }: { stats: Profile }) {
  return (
    <Section label="Statistik Saya">
      <div className="px-4 py-4 grid grid-cols-2 gap-3">
        <StatCard label="Chapter Dibaca" value={stats.total_reads ?? 0} />
        <StatCard label="Paket" value={stats.is_premium ? "Premium" : "Basic"} />
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-3">
          <FaInfoCircle className="text-white/70" />
          <span className="text-sm">Bergabung Sejak</span>
        </div>
        <span className="text-white/50 text-sm">
          {stats.created_at ? formatDate(stats.created_at) : "-"}
        </span>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-3">
          <FaShieldAlt className="text-white/70" />
          <span className="text-sm">Role</span>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full ${
            stats.role === "admin"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              : "bg-white/10 text-white/55 border border-white/10"
          }`}
        >
          {stats.role === "admin" ? "Admin" : "Member"}
        </span>
      </div>
    </Section>
  );
}

export function AccountSection({
  isLogin,
  isPremium,
  loading,
  premiumUntil,
  username,
  user,
  onLogin,
  onPremium,
}: {
  isLogin: boolean;
  isPremium: boolean;
  loading: boolean;
  premiumUntil?: string | null;
  username?: string | null;
  user?: User | null;
  onLogin: () => void;
  onPremium: () => void;
}) {
  return (
    <Section label="Akun">
      <button
        onClick={() => {
          if (!isLogin) onLogin();
        }}
        disabled={isLogin}
        className={`w-full flex items-center justify-between px-4 py-4 transition ${
          isLogin ? "cursor-not-allowed" : "hover:bg-white/[0.06]"
        }`}
      >
        <RowLeft icon={<FaSignInAlt className="text-white/70" />} label="Login" />
        <span className="text-white/40 text-sm">
          {isLogin ? user.user_metadata?.name || "User" : "Guest"}
        </span>
      </button>

      <button
        onClick={onPremium}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/[0.06] transition"
      >
        <RowLeft icon={<FaCrown className="text-white/70" />} label="Premium" />
        <span className="text-white/40 text-sm">
          {loading
            ? "..."
            : isPremium
              ? `${formatPremiumDaysLeft(premiumUntil)}`
              : "Free"}
          </span>
      </button>

      {isLogin && username && (
        <Link
          href={`/u/${encodeURIComponent(username)}`}
          className="flex w-full items-center justify-between px-4 py-4 transition hover:bg-white/[0.06]"
        >
          <RowLeft
            icon={<FaUserCircle className="text-white/70" />}
            label="Profil Publik"
          />
          <span className="text-white/40 text-sm">Lihat</span>
        </Link>
      )}
    </Section>
  );
}

export function AppearanceSection({
  themeColor,
  onOpenTheme,
}: {
  themeColor?: string;
  onOpenTheme: () => void;
}) {
  return (
    <Section label="Tampilan">
      <button
        type="button"
        onClick={onOpenTheme}
        className="flex w-full items-center justify-between px-4 py-4 hover:bg-white/[0.06]"
      >
        <RowLeft icon={<FaPalette className="text-white/70" />} label="Tema Website" />
        <ThemePreview themeKey={themeColor} />
      </button>
    </Section>
  );
}

export function PushNotificationSection() {
  return (
    <Section label="Notifikasi">
      <PushNotifToggle />
    </Section>
  );
}

export function PrivacySection({
  privacy,
  savingField,
  onToggle,
}: {
  privacy: PrivacySettings;
  savingField?: string | null;
  onToggle: (key: string) => void;
}) {
  const items = [
    {
      key: "show_public_reads",
      label: "Total Chapter Dibaca",
      desc: "Tampilkan jumlah chapter dibaca di profil publik",
    },
    {
      key: "show_public_comments",
      label: "Komentar Terbaru",
      desc: "Tampilkan jumlah dan daftar komentar di profil publik",
    },
    {
      key: "show_public_join_date",
      label: "Tanggal Bergabung",
      desc: "Tampilkan kapan akun kamu bergabung",
    },
  ];

  return (
    <Section label="Privacy">
      {items.map((item) => {
        const active = privacy[item.key] !== false;
        return (
          <button
            key={item.key}
            type="button"
            disabled={savingField === item.key}
            onClick={() => onToggle(item.key)}
            className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-white/[0.06] disabled:cursor-wait disabled:opacity-70"
          >
            <div className="flex min-w-0 items-start gap-3">
              <FaEye className="mt-0.5 shrink-0 text-white/70" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white/85">{item.label}</p>
                <p className="mt-1 text-xs text-white/35">{item.desc}</p>
              </div>
            </div>
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
                active
                  ? "border-cyan-200/35 bg-cyan-200/25"
                  : "border-white/10 bg-white/10"
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                  active ? "left-6" : "left-1"
                }`}
              />
            </span>
          </button>
        );
      })}
    </Section>
  );
}

export function StorageSection({
  coreCacheSize,
  onClearCache,
  onResetData,
}: {
  coreCacheSize: string | number;
  onClearCache: () => void;
  onResetData: () => void;
}) {
  return (
    <Section label="Storage & Cache">
      <button
        onClick={onClearCache}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/[0.06] transition"
      >
        <RowLeft icon={<FaShieldAlt className="text-white/70" />} label="Hapus Cache" />
        <span className="text-white/40 text-sm">{coreCacheSize} MB</span>
      </button>
      <button
        onClick={onResetData}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/[0.06] transition"
      >
        <RowLeft icon={<FaSync className="text-white/70" />} label="Reset Data" />
        <span className="text-white/40 text-sm">Reload</span>
      </button>
    </Section>
  );
}

export function BackupCloudSection({
  autoSyncBackup,
  lastAutoBackup,
  onBackup,
  onRestore,
  onToggleAutoSync,
}: {
  autoSyncBackup: boolean;
  lastAutoBackup?: string | number | Date | null;
  onBackup: () => void;
  onRestore: () => void;
  onToggleAutoSync: () => void;
}) {
  return (
    <Section label="Backup & Cloud">
      <button
        onClick={onToggleAutoSync}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/[0.06]"
      >
        <div>
          <RowLeft
            icon={<FaSync className="text-white/70" />}
            label={
              <span className="inline-flex items-center gap-2">
                Auto Sync Backup
                <VipBadge />
              </span>
            }
          />
          <p className="ml-8 mt-1 text-left text-[11px] text-white/35">
            {formatAutoSyncStatus(autoSyncBackup, lastAutoBackup)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            autoSyncBackup
              ? "bg-[var(--accent-2)]/15 text-[var(--accent-2)]"
              : "bg-white/10 text-white/40"
          }`}
        >
          {autoSyncBackup ? "ON" : "OFF"}
        </span>
      </button>

      <button
        onClick={onBackup}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/[0.06]"
      >
        <RowLeft icon={<CiExport className="text-xl text-white/70" />} label="Create Backup Data" />
        <span className="text-white/40 text-sm">Cloud</span>
      </button>

      <button
        onClick={onRestore}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/[0.06] transition"
      >
        <RowLeft icon={<CiImport className="text-xl text-white/70" />} label="Restore Backup Data" />
        <span className="text-white/40 text-sm">Sync</span>
      </button>
    </Section>
  );
}

export function SupportInfoSection() {
  const links = [
    { href: "/about", icon: <FaInfoCircle className="text-white/70" />, label: "About" },
    { href: "/help", icon: <FaQuestionCircle className="text-white/70" />, label: "Help" },
    {
      href: "/privacy-policy",
      icon: <FaShieldAlt className="text-white/70" />,
      label: "Privacy Policy",
    },
    {
      href: "/terms-of-service",
      icon: <FaShieldAlt className="text-white/70" />,
      label: "Terms of Service",
    },
  ];

  return (
    <Section label="Support & Info">
      {links.map(({ href, icon, label }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-3 px-4 py-4 hover:bg-white/[0.06] transition"
        >
          {icon}
          <span>{label}</span>
        </Link>
      ))}
    </Section>
  );
}

export function VisitorStatsSection() {
  return (
    <Section label="Statistik Pengunjung">
      <OnlineCounter />
      <div className="flex items-center justify-between px-4 py-4">
        <RowLeft icon={<FaChartBar className="text-white/70" />} label="Histats" />
        <div id="histats_counter" />
      </div>
    </Section>
  );
}

export function LogoutButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-10 w-full flex items-center gap-3 text-rose-300 py-4 border-t border-white/10 hover:bg-white/[0.05] transition"
    >
      <FaSignOutAlt />
      Logout
    </button>
  );
}
