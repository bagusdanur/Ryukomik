"use client";

import Link from "next/link";
import VipBadge from "@/components/VipBadge";

function AdminBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--accent-3)]/25 bg-[var(--accent-3)]/12 px-2 py-0.5 text-[9px] font-black uppercase leading-none tracking-widest text-[var(--accent-3)]">
      ADMIN
    </span>
  );
}

function Avatar({ profile, name }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="text-sm font-black text-white/45">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export default function ProfilePopover({ children, profile, href, align = "left" }) {
  const name = profile?.username || "User";
  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const xpPct = xp % 100;

  if (!href || !profile?.username) return children;

  return (
    <span className="group/profile relative inline-flex">
      <Link
        href={href}
        className="inline-flex rounded-xl text-left"
        aria-label={`Preview profil ${name}`}
      >
        {children}
      </Link>

      <span
        className={`pointer-events-none absolute bottom-full z-50 mb-2 hidden w-40 rounded-xl border border-white/10 bg-[color:color-mix(in_srgb,var(--surface-1)_95%,black)] p-2 text-left opacity-0 shadow-xl shadow-black/35 backdrop-blur transition group-hover/profile:block group-hover/profile:opacity-100 group-focus-within/profile:block group-focus-within/profile:opacity-100 ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        <span className="flex items-center gap-2">
          <Avatar profile={profile} name={name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-black text-white">
              {name}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-1">
              {profile.is_premium && <VipBadge />}
              {profile.role === "admin" && <AdminBadge />}
            </span>
          </span>
        </span>

        <span className="mt-2 block">
          <span className="mb-1 flex items-center justify-between text-[9px] font-bold uppercase">
            <span className="text-[var(--accent-2)]">Level {level}</span>
            <span className="text-white/35">{xp.toLocaleString("id-ID")}</span>
          </span>
          <span className="block h-1.5 overflow-hidden rounded-full bg-white/10">
            <span
              className="block h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${xpPct}%` }}
            />
          </span>
        </span>
      </span>
    </span>
  );
}
