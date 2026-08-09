"use client";

import {
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import { RiVipCrownLine } from "react-icons/ri";
import { useState } from "react";

type DashboardUser = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  premium_until?: string | null;
  is_premium?: boolean;
  role?: string | null;
  level?: number | null;
  xp?: number | null;
};

type UsersTabProps = {
  users: DashboardUser[];
  userTotal: number;
  userPage: number;
  totalPages: number;
  filter: string;
  search: string;
  usersLoading: boolean;
  fetchUsers: () => void;
  setFilter: (filter: string) => void;
  setSearch: (search: string) => void;
  setUserPage: (page: number | ((page: number) => number)) => void;
  givePremium: (userId: string, days?: number) => void;
  removePremium: (userId: string) => void;
  setUserRole: (userId: string, role: string | null) => void;
};

type AvatarProps = {
  name?: string | null;
  url?: string | null;
  size?: number;
};

function Avatar({ name = "", url = "", size = 36 }: AvatarProps) {
  const safeName = name || "";
  const initials = safeName.slice(0, 2).toUpperCase() || "??";
  const colors = [
    "bg-violet-500",
    "bg-amber-500",
    "bg-teal-500",
    "bg-pink-500",
    "bg-blue-500",
  ];
  const color = colors[safeName.charCodeAt(0) % colors.length] || colors[0];

  if (url) {
    return (
      <img
        src={url}
        alt={safeName}
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

export default function UsersTab({
  users,
  userTotal,
  userPage,
  totalPages,
  filter,
  search,
  usersLoading,
  fetchUsers,
  setFilter,
  setSearch,
  setUserPage,
  givePremium,
  removePremium,
  setUserRole,
}: UsersTabProps) {
  const [now] = useState(() => Date.now());
  const [premiumTarget, setPremiumTarget] = useState<DashboardUser | null>(null);
  const [customDays, setCustomDays] = useState(30);
  const [roleTarget, setRoleTarget] = useState<DashboardUser | null>(null);

  function openPremiumModal(user: DashboardUser, days = 30) {
    setCustomDays(days);
    setPremiumTarget(user);
  }

  function closePremiumModal() {
    setPremiumTarget(null);
    setCustomDays(30);
  }

  function submitPremiumDays() {
    if (!premiumTarget) return;
    givePremium(premiumTarget.id, customDays);
    closePremiumModal();
  }

  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-[15px] font-bold text-white">Kelola User</p>
          <p className="text-[11px] text-white/30">
            {userTotal.toLocaleString("id-ID")} user ditemukan
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={usersLoading}
          className="w-8 h-8 rounded-lg bg-white/[.05] border border-white/[.08] flex items-center justify-center text-white/40 hover:text-white transition-colors"
        >
          <FiRefreshCw
            size={13}
            className={usersLoading ? "animate-spin" : ""}
          />
        </button>
      </div>

      <div className="relative">
        <FiSearch
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
        />
        <input
          type="text"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setUserPage(1);
          }}
          placeholder="Cari username..."
          className="w-full bg-[#13131a] border border-white/[.07] rounded-xl py-2.5 pl-9 pr-4 text-[13px] text-white placeholder-white/25 outline-none focus:border-[#7c5cfc]/50 transition-colors"
        />
      </div>

      <div className="flex gap-2">
        {[
          { key: "all", label: "Semua" },
          { key: "premium", label: "Premium" },
          { key: "reguler", label: "Reguler" },
          { key: "staff", label: "Staff" },
          { key: "admin", label: "Admin" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setFilter(item.key);
              setUserPage(1);
            }}
            className={`flex-1 py-2 rounded-xl text-[11px] font-semibold border transition-all ${
              filter === item.key
                ? "bg-[#7c5cfc]/20 border-[#7c5cfc]/50 text-[#67e8f9]"
                : "bg-transparent border-white/[.08] text-white/35 hover:text-white/60"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {usersLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <FiUsers size={28} className="text-white/10 mx-auto mb-2" />
            <p className="text-white/25 text-[13px]">
              Tidak ada user ditemukan.
            </p>
          </div>
        ) : (
          users.map((user) => {
            const premiumUntilDate = user.premium_until
              ? new Date(user.premium_until)
              : null;
            const isActivePremium =
              user.is_premium &&
              premiumUntilDate &&
              premiumUntilDate.getTime() > now;
            const daysLeft = premiumUntilDate
              ? Math.ceil(
                  (premiumUntilDate.getTime() - now) /
                    (1000 * 60 * 60 * 24),
                )
              : 0;

            return (
              <div
                key={user.id}
                className="flex items-center gap-3 bg-[#13131a] border border-white/[.05] rounded-xl px-3 py-2.5"
              >
                <Avatar name={user.username} url={user.avatar_url} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-semibold text-white/85 truncate">
                      {user.username ?? "-"}
                    </p>
                    {user.role === "admin" && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                        Admin
                      </span>
                    )}
                    {user.role === "staff" && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                        Staff
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/30">
                    Lv {user.level ?? 0} - XP{" "}
                    {(user.xp ?? 0).toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {user.is_premium ? (
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isActivePremium
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        <RiVipCrownLine size={9} />
                        {isActivePremium ? "Aktif" : "Expired"}
                      </span>
                      {isActivePremium && daysLeft > 0 && (
                        <span className="text-[9px] font-bold text-[#67e8f9] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded-full">
                          {daysLeft} hari lagi
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => openPremiumModal(user)}
                      className="flex items-center gap-1 text-[10px] font-semibold bg-[#7c5cfc]/15 text-[#67e8f9] px-2.5 py-1 rounded-full hover:bg-[#7c5cfc]/25 transition-colors"
                    >
                      <FiPlus size={10} /> Premium
                    </button>
                  )}
                  <div className="flex gap-1">
                    {user.role !== "admin" && (
                      <button
                        onClick={() => setRoleTarget(user)}
                        className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
                        title="Ubah role"
                      >
                        <FiUsers size={11} />
                      </button>
                    )}
                    {user.is_premium && (
                      <>
                        <button
                          onClick={() => openPremiumModal(user, 7)}
                          className="w-7 h-7 rounded-lg bg-[#7c5cfc]/10 text-[#67e8f9] flex items-center justify-center hover:bg-[#7c5cfc]/20 transition-colors"
                          title="Tambah hari premium"
                        >
                          <FiPlus size={12} />
                        </button>
                        <button
                          onClick={() => removePremium(user.id)}
                          className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                          title="Hapus premium"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!usersLoading && users.length > 0 && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setUserPage((page) => Math.max(1, page - 1))}
            disabled={userPage <= 1}
            className="flex items-center gap-1 text-[12px] bg-[#13131a] border border-white/[.08] text-white/50 px-3 py-2 rounded-xl disabled:opacity-30 hover:text-white hover:border-white/20 transition-all"
          >
            <FiChevronLeft size={13} /> Prev
          </button>
          <span className="text-[11px] text-white/30">
            Hal {userPage} / {totalPages}
          </span>
          <button
            onClick={() => setUserPage((page) => Math.min(totalPages, page + 1))}
            disabled={userPage >= totalPages}
            className="flex items-center gap-1 text-[12px] bg-[#13131a] border border-white/[.08] text-white/50 px-3 py-2 rounded-xl disabled:opacity-30 hover:text-white hover:border-white/20 transition-all"
          >
            Next <FiChevronRight size={13} />
          </button>
        </div>
      )}

      {premiumTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-4"
          onClick={closePremiumModal}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/[.08] bg-[#13131a] p-4 text-white shadow-2xl shadow-black/40"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4">
              <p className="text-[15px] font-bold text-white">Tambah Premium</p>
              <p className="mt-1 text-[11px] text-white/35">
                {premiumTarget.username || "User"} akan mendapat tambahan hari.
              </p>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2">
              {[3, 7, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setCustomDays(days)}
                  className={`rounded-xl border py-2 text-xs font-bold transition ${
                    customDays === days
                      ? "border-[#7c5cfc]/50 bg-[#7c5cfc]/20 text-[#67e8f9]"
                      : "border-white/[.08] bg-white/[.04] text-white/45"
                  }`}
                >
                  +{days} hari
                </button>
              ))}
            </div>

            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/25">
              Custom hari
            </label>
            <input
              type="number"
              min={1}
              max={3650}
              value={customDays}
              onChange={(event) => setCustomDays(Number(event.target.value))}
              className="mb-4 w-full rounded-xl border border-white/[.08] bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-[#7c5cfc]/50"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={closePremiumModal}
                className="rounded-xl border border-white/[.08] bg-white/[.04] py-2.5 text-xs font-bold text-white/55"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={submitPremiumDays}
                className="rounded-xl bg-[#7c5cfc] py-2.5 text-xs font-bold text-white"
              >
                Tambahkan
              </button>
            </div>
          </div>
        </div>
      )}

      {roleTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-4"
          onClick={() => setRoleTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/[.08] bg-[#13131a] p-4 text-white shadow-2xl shadow-black/40"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4">
              <p className="text-[15px] font-bold text-white">Ubah Role</p>
              <p className="mt-1 text-[11px] text-white/35">
                {roleTarget.username || "User"} — role saat ini:{" "}
                <span className="font-semibold text-white/60">
                  {roleTarget.role === "admin"
                    ? "Admin"
                    : roleTarget.role === "staff"
                      ? "Staff"
                      : "Member"}
                </span>
              </p>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              {[
                { key: null, label: "Member", active: "border-white/45 bg-white/10 text-white/70" },
                { key: "staff", label: "Staff", active: "border-emerald-400/50 bg-emerald-400/20 text-emerald-400" },
                { key: "admin", label: "Admin", active: "border-rose-400/50 bg-rose-400/20 text-rose-400" },
              ].map((item) => {
                const isActive =
                  roleTarget.role === item.key || (!roleTarget.role && !item.key);
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setUserRole(roleTarget.id, item.key);
                      setRoleTarget(null);
                    }}
                    className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                      isActive
                        ? item.active
                        : "border-white/[.08] bg-white/[.04] text-white/45 hover:text-white/70"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setRoleTarget(null)}
              className="w-full rounded-xl border border-white/[.08] bg-white/[.04] py-2.5 text-xs font-bold text-white/55"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </>
  );
}
