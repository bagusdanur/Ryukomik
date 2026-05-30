"use client";

import dynamicImport from "next/dynamic";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { FiSearch } from "react-icons/fi";

type FilesTab = "favorite" | "history" | "collections";

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

function normalizeTab(value: string | null): FilesTab {
  if (value === "download") return "collections";
  if (value === "favorite" || value === "history" || value === "collections") {
    return value;
  }
  return "favorite";
}

export default function FilesClient() {
  const searchParams = useSearchParams();
  const initialTab = normalizeTab(searchParams.get("tab"));

  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState("");

  // ⬅️ update tab kalau URL berubah
  useEffect(() => {
    const t = searchParams.get("tab");
    if (!t) return;
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
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/60">
            Library
          </p>
          <h1 className="text-2xl font-black">Files</h1>
        </div>
        {/* TAB HEADER */}
        <div className="rk-card-soft mb-4 flex gap-1 rounded-2xl p-1 text-sm font-semibold">
          {[
            { id: "favorite", label: "Favorite" },
            { id: "history", label: "History" },
            { id: "collections", label: "Collections" },
           
          ].map((t: { id: FilesTab; label: string }) => (
            <button
              key={t.id}
              onClick={() => changeTab(t.id)}
              className={`flex-1 rounded-xl px-3 py-2.5 transition ${
                tab === t.id
                  ? "bg-violet-500/15 text-cyan-100"
                  : "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* SEARCH */}
        <div className="relative mb-5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="rk-input w-full rounded-2xl px-4 py-3 pr-10"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-200/65">
            <FiSearch />
          </span>
        </div>

        {/* CONTENT */}
        {tab === "favorite" && <FavoriteTab search={search} />}
        {tab === "history" && <HistoryTab search={search} />}
        {tab === "collections" && <CollectionTab search={search} />}
      </div>
    </div>
  );
}
