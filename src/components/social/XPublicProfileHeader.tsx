"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FiBell,
  FiCalendar,
  FiEdit3,
  FiFlag,
  FiGrid,
  FiLink,
  FiMapPin,
  FiMessageCircle,
  FiMoreHorizontal,
  FiSlash,
  FiUserX,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { supabase } from "@/lib/supabaseClient";
import { socialFetch } from "@/lib/social/client";

type SocialProfile = {
  id: string;
  username: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  level?: number;
  role?: string;
  is_premium?: boolean;
  created_at?: string;
  followers: number;
  following: number;
  collections: number;
};

function fallbackAvatar(name: string) {
  return name.slice(0, 1).toUpperCase();
}

export default function XPublicProfileHeader({ username }: { username: string }) {
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [following, setFollowing] = useState(false);
  const [ownProfile, setOwnProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const response = await fetch(
        `/api/social/profile/${encodeURIComponent(username)}`,
        { headers: token ? { authorization: `Bearer ${token}` } : undefined },
      );
      if (!response.ok || !active) return;
      const result = (await response.json()) as {
        profile: SocialProfile;
        viewerFollowing: boolean;
      };
      setProfile(result.profile);
      setFollowing(result.viewerFollowing);
      setOwnProfile(sessionData.session?.user.id === result.profile.id);
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [username]);

  async function toggleFollow() {
    if (!profile || loading) return;
    setLoading(true);
    try {
      await socialFetch("/api/social/follow", {
        method: following ? "DELETE" : "POST",
        body: JSON.stringify({ targetUserId: profile.id }),
      });
      setFollowing((value) => !value);
      setProfile((value) =>
        value
          ? {
              ...value,
              followers: Math.max(0, value.followers + (following ? -1 : 1)),
            }
          : value,
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal memproses follow.");
    } finally {
      setLoading(false);
    }
  }

  async function relationship(kind: "mute" | "block") {
    if (!profile) return;
    const action = kind === "block" ? "memblokir" : "membisukan";
    if (!confirm(`Yakin ingin ${action} @${profile.username}?`)) return;
    try {
      await socialFetch("/api/social/relationship", {
        method: "POST",
        body: JSON.stringify({ targetUserId: profile.id, kind }),
      });
      setMenuOpen(false);
      if (kind === "block") window.location.href = "/feed";
      else alert(`Aktivitas @${profile.username} sudah dibisukan.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Aksi gagal.");
    }
  }

  async function reportProfile() {
    if (!profile) return;
    const reason = prompt("Jelaskan alasan laporan profile ini:");
    if (!reason) return;
    try {
      await socialFetch("/api/social/reports", {
        method: "POST",
        body: JSON.stringify({
          targetType: "profile",
          targetId: profile.id,
          reason,
        }),
      });
      setMenuOpen(false);
      alert("Laporan berhasil dikirim.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Laporan gagal dikirim.");
    }
  }

  if (!profile) {
    return (
      <div className="mx-auto h-[420px] max-w-2xl animate-pulse border-x border-white/[0.08] bg-white/[0.025]" />
    );
  }

  const joined = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      })
    : null;

  const menuItem =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/75 transition hover:bg-white/[0.06] hover:text-white";

  return (
    <header className="mx-auto max-w-2xl overflow-visible border-x border-b border-white/[0.09] bg-[var(--surface-0)] text-white sm:rounded-b-2xl">
      <div className="relative h-36 overflow-hidden bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_35%,var(--surface-2)),color-mix(in_srgb,var(--accent-2)_18%,var(--surface-0)))] sm:h-48 sm:rounded-t-2xl">
        {profile.banner_url && (
          <img
            src={profile.banner_url}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
      </div>

      <div className="relative px-4 pb-4">
        <div className="flex min-h-14 items-start justify-between gap-3">
          <div className="-mt-12 grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-[var(--surface-0)] bg-[var(--surface-2)] text-3xl font-black sm:-mt-16 sm:h-32 sm:w-32">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              fallbackAvatar(profile.username)
            )}
          </div>

          <div className="relative flex min-w-0 items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-white/70 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Buka menu profil"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <FiX /> : <FiMoreHorizontal />}
            </button>

            {!ownProfile && (
              <button
                disabled={loading}
                onClick={toggleFollow}
                className={`h-9 shrink-0 rounded-full px-4 text-xs font-black transition disabled:opacity-50 sm:px-5 sm:text-sm ${
                  following
                    ? "border border-white/20 bg-transparent text-white"
                    : "bg-white text-black"
                }`}
              >
                {loading ? "..." : following ? "Mengikuti" : "Ikuti"}
              </button>
            )}

            {ownProfile && (
              <Link
                href="/social-settings"
                className="grid h-9 shrink-0 place-items-center rounded-full border border-white/20 px-3 text-[11px] font-black transition hover:bg-white/[0.06] sm:px-4 sm:text-xs"
              >
                Edit profil
              </Link>
            )}

            {menuOpen && (
              <>
                <button
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Tutup menu"
                />
                <div className="absolute right-0 top-14 z-50 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[var(--surface-1)] p-2 shadow-2xl">
                  {ownProfile ? (
                    <>
                      <Link href="/social-settings" className={menuItem}>
                        <FiEdit3 /> Edit profil sosial
                      </Link>
                      <Link href="/connections" className={menuItem}>
                        <FiUsers /> Pengikut & mengikuti
                      </Link>
                      <Link href="/notifications" className={menuItem}>
                        <FiBell /> Notifikasi
                      </Link>
                      <Link href="/social-controls" className={menuItem}>
                        <FiSlash /> Kontrol sosial
                      </Link>
                      <Link href="/social-collections" className={menuItem}>
                        <FiGrid /> Kelola koleksi
                      </Link>
                    </>
                  ) : (
                    <>
                      <button onClick={() => relationship("mute")} className={menuItem}>
                        <FiSlash /> Bisukan aktivitas
                      </button>
                      <button
                        onClick={() => relationship("block")}
                        className={`${menuItem} text-red-300 hover:text-red-200`}
                      >
                        <FiUserX /> Blokir pengguna
                      </button>
                      <button onClick={reportProfile} className={menuItem}>
                        <FiFlag /> Laporkan profil
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <h1 className="mt-2 break-words text-xl font-black leading-tight">
          {profile.username}
        </h1>
        <p className="break-all text-sm text-white/40">
          @{profile.username.toLowerCase().replace(/\s+/g, "_")}
        </p>
        <p className="mt-3 whitespace-pre-line break-words text-[15px] leading-relaxed text-white/85">
          {profile.bio || "Pembaca dan bagian dari komunitas Ryukomik."}
        </p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/45">
          <span className="flex items-center gap-1"><FiMapPin /> Ryukomik</span>
          <span className="flex items-center gap-1"><FiLink /> Level {profile.level || 1}</span>
          {joined && (
            <span className="flex items-center gap-1"><FiCalendar /> Bergabung {joined}</span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href={`/connections?tab=following&userId=${encodeURIComponent(profile.id)}`} className="hover:underline">
            <strong>{profile.following}</strong>{" "}
            <span className="text-white/45">Mengikuti</span>
          </Link>
          <Link href={`/connections?tab=followers&userId=${encodeURIComponent(profile.id)}`} className="hover:underline">
            <strong>{profile.followers}</strong>{" "}
            <span className="text-white/45">Pengikut</span>
          </Link>
          <a href="#profile-collections" className="hover:underline">
            <strong>{profile.collections}</strong>{" "}
            <span className="text-white/45">Koleksi</span>
          </a>
        </div>
      </div>

      <nav className="grid grid-cols-3 overflow-hidden border-t border-white/[0.08]" aria-label="Navigasi profil">
        <a href="#social-profile-posts" className="relative flex h-12 min-w-0 items-center justify-center gap-1.5 px-1 text-xs font-bold transition hover:bg-white/[0.04] sm:gap-2 sm:text-sm">
          <FiMessageCircle className="shrink-0" />
          <span className="truncate">Postingan</span>
          <span className="absolute bottom-0 h-1 w-12 rounded-full bg-[var(--accent-2)] sm:w-14" />
        </a>
        <a href="#profile-collections" className="flex h-12 min-w-0 items-center justify-center gap-1.5 px-1 text-xs font-bold text-white/55 transition hover:bg-white/[0.04] sm:gap-2 sm:text-sm">
          <FiGrid className="shrink-0" />
          <span className="truncate">Koleksi</span>
        </a>
        <a href="#profile-activity" className="flex h-12 min-w-0 items-center justify-center px-1 text-xs font-bold text-white/55 transition hover:bg-white/[0.04] sm:text-sm">
          <span className="truncate">Aktivitas</span>
        </a>
      </nav>
    </header>
  );
}
