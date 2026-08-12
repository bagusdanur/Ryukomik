"use client";

import dynamicImport from "next/dynamic";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { FiBookOpen, FiClock, FiFolder, FiHeart, FiSearch, FiUsers } from "react-icons/fi";
import CommunityNotifications from "@/components/social/CommunityNotifications";
import { socialFetch } from "@/lib/social/client";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

type FilesTab = "timeline" | "favorite" | "history" | "collections";
type MiniProfile = { username: string; avatar_url?: string | null };

const TabLoading = () => (
  <div className="rk-card-soft rounded-2xl py-10 text-center text-sm text-white/50">
    Loading...
  </div>
);

const FavoriteTab = dynamicImport(() => import("./FavoriteTab"), {
  loading: TabLoading,
  ssr: false,
});
const HistoryTab = dynamicImport(() => import("./HistoryTab"), {
  loading: TabLoading,
  ssr: false,
});
const CollectionTab = dynamicImport(() => import("./CollectionTab"), {
  loading: TabLoading,
  ssr: false,
});
const SocialTimeline = dynamicImport(() => import("@/components/social/SocialTimeline"), { loading: TabLoading, ssr: false });

function normalizeTab(value: string | null): FilesTab {
  if (value === "download") return "collections";
  if (value === "timeline" || value === "favorite" || value === "history" || value === "collections") {
    return value;
  }
  return "timeline";
}

export default function FilesClient() {
  const { user } = useSupabaseUser();
  const searchParams = useSearchParams();
  const initialTab = normalizeTab(searchParams.get("tab"));

  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState<MiniProfile | null>(null);

  useEffect(() => {
    if (!user) return;
    socialFetch<{ profile: MiniProfile | null }>("/api/social/me/profile")
      .then((result) => setProfile(result.profile))
      .catch(() => undefined);
  }, [user]);

  // ⬅️ update tab kalau URL berubah
  useEffect(() => {
    const t = searchParams.get("tab");
    const id = requestAnimationFrame(() => setTab(normalizeTab(t)));
    return () => cancelAnimationFrame(id);
  }, [searchParams]);

  function changeTab(id: FilesTab) {
    setTab(id);
    window.history.replaceState(null, "", `/files?tab=${id}`);
  }

 

  return (
    <div className="rk-page px-4 pt-4 pb-24 text-white">
      <div className="rk-shell max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/60">Social & Library</p>
            <h1 className="text-2xl font-black">Komunitas</h1>
            <p className="mt-1 text-xs text-white/40">Timeline, notifikasi, dan semua bacaan tersimpan.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href="/connections" aria-label="Koneksi sosial" title="Koneksi sosial" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white/55 transition hover:bg-white/5 hover:text-white"><FiUsers /></Link>
            <CommunityNotifications />
            <Link href={profile?.username ? `/u/${encodeURIComponent(profile.username)}` : "/social-settings"} aria-label="Buka profil sosial" title="Profil sosial" className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-white/15 bg-white/5 text-sm font-black text-white/70 transition hover:border-white/30">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : (profile?.username || "U")[0]?.toUpperCase()}
            </Link>
          </div>
        </div>
        {/* TAB HEADER */}
        <div className="rk-card-soft mb-4 grid grid-cols-4 gap-1 overflow-hidden rounded-2xl p-1 text-[10px] font-semibold sm:text-xs">
          {[
            { id: "timeline", label: "Timeline", icon: FiBookOpen },
            { id: "favorite", label: "Favorit", icon: FiHeart },
            { id: "history", label: "Riwayat", icon: FiClock },
            { id: "collections", label: "Koleksi", icon: FiFolder },
          ].map((t) => {
            const Icon = t.icon;
            return (
            <button
              key={t.id}
              onClick={() => changeTab(t.id as FilesTab)}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition sm:flex-row sm:gap-1.5 sm:px-2 ${
                tab === t.id
                  ? "bg-violet-500/15 text-cyan-100"
                  : "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
              }`}
            >
              <Icon className="shrink-0 text-sm" />
              <span className="max-w-full truncate">{t.label}</span>
            </button>
          )})}
        </div>

        {/* SEARCH */}
        {(tab === "favorite" || tab === "history" || tab === "collections") && <div className="relative mb-5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari bacaan tersimpan..."
            className="rk-input w-full rounded-2xl px-4 py-3 pr-10"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-200/65">
            <FiSearch />
          </span>
        </div>}

        {/* CONTENT */}
        {tab === "timeline" && <SocialTimeline />}
        {tab === "favorite" && <FavoriteTab search={search} />}
        {tab === "history" && <HistoryTab search={search} />}
        {tab === "collections" && <CollectionTab search={search} />}
      </div>
    </div>
  );
}
