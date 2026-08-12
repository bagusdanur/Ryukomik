"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiCalendar, FiGrid, FiLink, FiMapPin, FiMessageCircle, FiMoreHorizontal } from "react-icons/fi";
import { supabase } from "@/lib/supabaseClient";
import { socialFetch } from "@/lib/social/client";

type SocialProfile = {
  id: string; username: string; avatar_url?: string | null; banner_url?: string | null;
  bio?: string | null; level?: number; role?: string; is_premium?: boolean;
  created_at?: string; followers: number; following: number; collections: number;
};

function fallbackAvatar(name: string) { return name.slice(0, 1).toUpperCase(); }

export default function XPublicProfileHeader({ username }: { username: string }) {
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [following, setFollowing] = useState(false);
  const [ownProfile, setOwnProfile] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const response = await fetch(`/api/social/profile/${encodeURIComponent(username)}`, {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok || !active) return;
      const result = await response.json() as { profile: SocialProfile; viewerFollowing: boolean };
      setProfile(result.profile); setFollowing(result.viewerFollowing);
      setOwnProfile(sessionData.session?.user.id === result.profile.id);
    })().catch(() => undefined);
    return () => { active = false; };
  }, [username]);

  async function toggleFollow() {
    if (!profile || loading) return; setLoading(true);
    try {
      await socialFetch("/api/social/follow", { method: following ? "DELETE" : "POST", body: JSON.stringify({ targetUserId: profile.id }) });
      setFollowing((value) => !value);
      setProfile((value) => value ? { ...value, followers: Math.max(0, value.followers + (following ? -1 : 1)) } : value);
    } catch (error) { alert(error instanceof Error ? error.message : "Gagal memproses follow."); }
    finally { setLoading(false); }
  }

  function scrollTo(kind: "profile" | "collection" | "activity") {
    if (kind === "profile") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const root = document.querySelector(".legacy-profile-content");
    const candidates = root?.querySelectorAll("section, [class*='collection']");
    const match = Array.from(candidates || []).find((element) => kind === "collection" ? /koleksi/i.test(element.textContent || "") : /komentar terbaru|aktivitas publik/i.test(element.textContent || ""));
    match?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!profile) return <div className="mx-auto h-[420px] max-w-2xl animate-pulse border-x border-white/[0.08] bg-white/[0.025]" />;
  const joined = profile.created_at ? new Date(profile.created_at).toLocaleDateString("id-ID", { month: "long", year: "numeric" }) : null;

  return <header className="mx-auto max-w-2xl overflow-hidden border-x border-b border-white/[0.09] bg-[var(--surface-0)] text-white sm:rounded-b-2xl">
    <div className="relative h-36 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_35%,var(--surface-2)),color-mix(in_srgb,var(--accent-2)_18%,var(--surface-0)))] sm:h-48">
      {profile.banner_url && <img src={profile.banner_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
    </div>
    <div className="relative px-4 pb-4">
      <div className="flex min-h-14 items-start justify-between">
        <div className="-mt-12 grid h-24 w-24 place-items-center overflow-hidden rounded-full border-4 border-[var(--surface-0)] bg-[var(--surface-2)] text-3xl font-black sm:-mt-16 sm:h-32 sm:w-32">
          {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.username} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : fallbackAvatar(profile.username)}
        </div>
        <div className="flex items-center gap-2 pt-3">
          <button className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/70" aria-label="Menu profil"><FiMoreHorizontal /></button>
          {!ownProfile && <button disabled={loading} onClick={toggleFollow} className={`h-9 rounded-full px-5 text-sm font-black transition disabled:opacity-50 ${following ? "border border-white/20 bg-transparent text-white" : "bg-white text-black"}`}>{loading ? "..." : following ? "Mengikuti" : "Ikuti"}</button>}
          {ownProfile && <Link href="/setting" className="grid h-9 place-items-center rounded-full border border-white/20 px-4 text-xs font-black">Edit profil</Link>}
        </div>
      </div>
      <h1 className="mt-2 text-xl font-black leading-tight">{profile.username}</h1>
      <p className="text-sm text-white/40">@{profile.username.toLowerCase().replace(/\s+/g, "_")}</p>
      <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-white/85">{profile.bio || "Pembaca dan bagian dari komunitas Ryukomik."}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/45">
        <span className="flex items-center gap-1"><FiMapPin /> Ryukomik</span>
        <span className="flex items-center gap-1"><FiLink /> Level {profile.level || 1}</span>
        {joined && <span className="flex items-center gap-1"><FiCalendar /> Bergabung {joined}</span>}
      </div>
      <div className="mt-3 flex gap-5 text-sm"><span><strong>{profile.following}</strong> <span className="text-white/45">Mengikuti</span></span><span><strong>{profile.followers}</strong> <span className="text-white/45">Pengikut</span></span><span><strong>{profile.collections}</strong> <span className="text-white/45">Koleksi</span></span></div>
    </div>
    <nav className="grid grid-cols-3 border-t border-white/[0.08]" aria-label="Navigasi profil">
      <button onClick={() => scrollTo("profile")} className="relative flex h-12 items-center justify-center gap-2 text-sm font-bold hover:bg-white/[0.04]"><FiMessageCircle /> Postingan<span className="absolute bottom-0 h-1 w-14 rounded-full bg-[var(--accent-2)]" /></button>
      <button onClick={() => scrollTo("collection")} className="flex h-12 items-center justify-center gap-2 text-sm font-bold text-white/55 hover:bg-white/[0.04]"><FiGrid /> Koleksi</button>
      <button onClick={() => scrollTo("activity")} className="flex h-12 items-center justify-center text-sm font-bold text-white/55 hover:bg-white/[0.04]">Aktivitas</button>
    </nav>
  </header>;
}
