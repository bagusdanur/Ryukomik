"use client";

import dynamicImport from "next/dynamic";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { FiBell, FiBookOpen, FiClock, FiFolder, FiHeart, FiSearch, FiUser, FiUsers } from "react-icons/fi";

type FilesTab = "timeline" | "notifications" | "favorite" | "history" | "collections";

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
const NotificationsClient = dynamicImport(() => import("@/app/notifications/NotificationsClient"), { loading: TabLoading, ssr: false });

function normalizeTab(value: string | null): FilesTab {
  if (value === "download") return "collections";
  if (value === "timeline" || value === "notifications" || value === "favorite" || value === "history" || value === "collections") {
    return value;
  }
  return "timeline";
}

export default function FilesClient() {
  const searchParams = useSearchParams();
  const initialTab = normalizeTab(searchParams.get("tab"));

  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState("");

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
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/60">Social & Library</p>
            <h1 className="text-2xl font-black">Komunitas</h1>
            <p className="mt-1 text-xs text-white/40">Timeline, notifikasi, dan semua bacaan tersimpan.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href="/connections" aria-label="Koneksi sosial" title="Koneksi sosial" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white/55 transition hover:bg-white/5 hover:text-white"><FiUsers /></Link>
            <Link href="/social-settings" aria-label="Profil sosial" title="Profil sosial" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white/55 transition hover:bg-white/5 hover:text-white"><FiUser /></Link>
          </div>
        </div>
        {/* TAB HEADER */}
        <div className="rk-card-soft mb-4 grid grid-cols-5 gap-1 overflow-hidden rounded-2xl p-1 text-[10px] font-semibold sm:text-xs">
          {[
            { id: "timeline", label: "Timeline", icon: FiBookOpen },
            { id: "notifications", label: "Notif", icon: FiBell },
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
        {tab === "notifications" && <NotificationsClient />}
        {tab === "favorite" && <FavoriteTab search={search} />}
        {tab === "history" && <HistoryTab search={search} />}
        {tab === "collections" && <CollectionTab search={search} />}
      </div>
    </div>
  );
}
