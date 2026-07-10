"use client";
import { useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { SourceId } from "@/types/content";
import { useUserProfile } from "@/hooks/useUserProfile";

import {
  FaFilter,
  FaUserCircle,
  FaExchangeAlt,
  FaGlobeAsia,
  FaCheckCircle,
} from "react-icons/fa";
import { FiSearch } from "react-icons/fi";

interface HeaderBarProps {
  user: User | null;
  showFilter: boolean;
  setShowFilter: Dispatch<SetStateAction<boolean>>;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  setShowLogin: Dispatch<SetStateAction<boolean>>;
  children: ReactNode;
  source: SourceId;
  setSource: (source: SourceId) => void;
  setShowAgeModal: Dispatch<SetStateAction<boolean>>;
  isAdult: boolean;
  setTargetSource: Dispatch<SetStateAction<SourceId | null>>;
}

export default function HeaderBar({
  user,
  showFilter,
  setShowFilter,
  onSearch,
  setShowLogin,
  children, // notif dropdown masuk sini
  source,
  setSource,
  setShowAgeModal,
  isAdult,
  setTargetSource,
}: HeaderBarProps) {
  const [showSource, setShowSource] = useState(false);
  const router = useRouter();
  const { avatarUrl, displayName } = useUserProfile(user);

  const sourceMap: Record<SourceId, string> = {
    komiku: "1",
    komikid: "2",
    kiryuu: "2 (Legacy)",
    luvyaa: "3",
    sekte: "4",
    doujindesu: "5",
    meionovels: "Novel",
  };

  return (
    <div className="rk-topbar fixed top-0 left-0 w-full z-50">
      <div className="max-w-screen-xl mx-auto px-3 py-2.5 flex items-center gap-3">
        {/* SEARCH (TIDAK DIUBAH) */}
        <form
          onSubmit={onSearch}
          className="rk-input flex h-10 min-w-0 flex-1 items-center gap-2 rounded-2xl px-3"
        >
          <input
            name="search"
            type="text"
            placeholder="Cari komik..."
            className="bg-transparent outline-none text-sm text-white placeholder-white/45 flex-1 min-w-0"
          />

          <button
            type="button"
            onClick={() => setShowFilter(!showFilter)}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
              showFilter
                ? "bg-[color:color-mix(in_srgb,var(--accent-2)_18%,transparent)] text-[var(--accent-2)]"
                : "text-white/55 hover:bg-white/[0.06] hover:text-white"
            }`}
            aria-label="Filter"
          >
            <FaFilter size={14} />
          </button>

          <button
            type="submit"
            className="text-cyan-200/70 hover:text-white shrink-0 transition"
            aria-label="Cari"
          >
            <FiSearch size={18} />
          </button>
        </form>

        {showSource && (
          <div className="absolute top-14 right-12 mt-2 w-44 rk-card overflow-hidden rounded-2xl z-50">
            {/* KOMIKU - jadi Source 1 */}
            <button
              onClick={() => {
                setSource("komiku");
                setShowSource(false);
              }}
              className={`flex items-center justify-between w-full px-4 py-2 text-sm transition
    ${source === "komiku" ? "bg-cyan-400/10 text-cyan-200" : "text-white/75 hover:bg-white/[0.06]"}`}
            >
              <div className="flex items-center gap-2">
                <FaGlobeAsia className="text-xs" />
                <span>Source 1</span>
              </div>
              {source === "komiku" && (
                <FaCheckCircle className="text-cyan-300 text-xs" />
              )}
            </button>

            {/* KOMIKID - jadi Source 2 */}
            <button
              onClick={() => {
                setSource("komikid");
                setShowSource(false);
              }}
              className={`flex items-center justify-between w-full px-4 py-2 text-sm transition
    ${source === "komikid" ? "bg-violet-500/10 text-violet-200" : "text-white/75 hover:bg-white/[0.06]"}`}
            >
              <div className="flex items-center gap-2">
                <FaGlobeAsia className="text-xs" />
                <span>Source 2</span>
              </div>
              {source === "komikid" && (
                <FaCheckCircle className="text-violet-300 text-xs" />
              )}
            </button>

            {/* luvyaa - jadi Source 3 */}
            <button
              onClick={() => {
                setSource("luvyaa");
                setShowSource(false);
              }}
              className={`flex items-center justify-between w-full px-4 py-2 text-sm transition
    ${source === "luvyaa" ? "bg-cyan-400/10 text-cyan-200" : "text-white/75 hover:bg-white/[0.06]"}`}
            >
              <div className="flex items-center gap-2">
                <FaGlobeAsia className="text-xs" />
                <span>Source 3</span>
              </div>
              {source === "luvyaa" && (
                <FaCheckCircle className="text-cyan-300 text-xs" />
              )}
            </button>

            {/* sekte */}
            <button
              onClick={() => {
                if (!isAdult) {
                  setShowAgeModal(true);
                  setTargetSource("sekte");
                  return;
                }

                if (!user) {
                  setShowLogin(true);

                  return;
                }

                setSource("sekte");
                setShowSource(false);
              }}
              className={`flex items-center justify-between w-full px-4 py-2 text-sm transition
        ${
          source === "sekte"
            ? "bg-rose-500/10 text-rose-300"
            : "text-white/75 hover:bg-white/[0.06]"
        }`}
            >
              <div className="flex items-center gap-2">
                <FaGlobeAsia className="text-xs" />
                <span>Source 4</span>
                <span className="text-red-400">18+</span>
              </div>

              {source === "sekte" && (
                <FaCheckCircle className="text-rose-300 text-xs" />
              )}
            </button>

            {/* doujindesu */}
            <button
              onClick={() => {
                if (!isAdult) {
                  setShowAgeModal(true);
                  setTargetSource("doujindesu");
                  return;
                }

                if (!user) {
                  setShowLogin(true);

                  return;
                }

                setSource("doujindesu");
                setShowSource(false);
              }}
              className={`flex items-center justify-between w-full px-4 py-2 text-sm transition
        ${
          source === "doujindesu"
            ? "bg-rose-500/10 text-rose-300"
            : "text-white/75 hover:bg-white/[0.06]"
        }`}
            >
              <div className="flex items-center gap-2">
                <FaGlobeAsia className="text-xs" />
                <span>Source 5</span>
                <span className="text-red-400">18+</span>
              </div>

              {source === "doujindesu" && (
                <FaCheckCircle className="text-rose-300 text-xs" />
              )}
            </button>

            {/* meionovels */}
            <button
              onClick={() => {
                setSource("meionovels");
                setShowSource(false);
              }}
              className={`flex items-center justify-between w-full px-4 py-2 text-sm transition
        ${
          source === "meionovels"
            ? "bg-violet-500/10 text-violet-200"
            : "text-white/75 hover:bg-white/[0.06]"
        }`}
            >
              <div className="flex items-center gap-2">
                <FaGlobeAsia className="text-xs" />
                <span>Novel</span>
              </div>

              {source === "meionovels" && (
                <FaCheckCircle className="text-violet-300 text-xs" />
              )}
            </button>
          </div>
        )}

        <div className="relative">
          <button
            onClick={() => setShowSource(!showSource)}
            className="rk-btn-ghost flex h-10 items-center gap-2 rounded-full px-3 text-sm"
          >
            <FaExchangeAlt className="text-xs" />

            {/* 🔥 tampilkan source aktif */}
            <span className="capitalize">{sourceMap[source]}</span>
          </button>
        </div>

        {/* 🔔 NOTIFICATION (DARI CHILDREN) */}
        {children}

        {/* USER (TIDAK DIUBAH SAMA SEKALI) */}
        <div className="shrink-0 flex justify-center items-center">
          {!user ? (
            <button
              onClick={() => setShowLogin(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
              aria-label="Login"
            >
              <FaUserCircle className="text-white/80 hover:text-cyan-200 transition" size={32} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/setting")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
              aria-label="Buka setting akun"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 rounded-full border border-white/20 object-cover"
                  alt={displayName}
                />
              ) : (
                <FaUserCircle
                  className="text-white/80 hover:text-[var(--accent-2)] transition"
                  size={32}
                />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
