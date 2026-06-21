"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiSearch, FiMenu, FiX, FiHome } from "react-icons/fi";
import { FaUserCircle, FaGamepad } from "react-icons/fa";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { useUserProfile } from "@/hooks/useUserProfile";
import LoginModal from "@/components/LoginModal";

interface TopupHeaderProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

export default function TopupHeader({ searchQuery = "", onSearchChange }: TopupHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  
  const { user } = useSupabaseUser();
  const { avatarUrl, displayName } = useUserProfile(user);
  const router = useRouter();

  return (
    <>
      <header className="sticky top-0 z-50 bg-[rgba(10,12,20,0.85)] backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-[74px] flex items-center justify-between gap-4">
          
          {/* LOGO RYUTOPUP */}
          <Link href="/topup" className="flex items-center gap-1.5 shrink-0 select-none">
            <span className="text-xl font-black italic tracking-wide text-white">
              Ryu<span className="bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] bg-clip-text text-transparent">Topup</span>
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/topup"
              className="px-3.5 py-2 rounded-full text-sm font-semibold text-white/70 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Beranda
            </Link>
            <Link
              href="/game"
              className="px-3.5 py-2 rounded-full text-sm font-semibold text-white/70 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Semua Game
            </Link>
            <Link
              href="/topup/lacak"
              className="px-3.5 py-2 rounded-full text-sm font-semibold text-white/70 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Lacak Pesanan
            </Link>
          </nav>

          {/* SEARCH BAR */}
          <div className="hidden md:flex flex-1 max-w-[360px] items-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] focus-within:border-[var(--accent-3)]/50 focus-within:bg-[var(--surface-2)] transition-all rounded-full px-4 py-2.5 text-white/40 text-xs">
            <FiSearch className="w-[15px] h-[15px] text-white/50" />
            <input
              type="text"
              placeholder="Cari game favoritmu..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="bg-transparent border-none outline-none text-white w-full text-xs placeholder-white/30"
            />
          </div>

          {/* DYNAMIC USER AVATAR / ACTIONS */}
          <div className="flex items-center gap-2.5 shrink-0">
            {!user ? (
              <button
                onClick={() => setShowLogin(true)}
                className="hidden sm:inline-flex items-center justify-center font-bold text-[13.5px] text-white bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] hover:brightness-110 rounded-full px-6 py-2.5 shadow-[0_4px_15px_rgba(244,63,94,0.2)] hover:translate-y-[-1px] transition-all"
              >
                Masuk
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/setting")}
                className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
                aria-label="Buka setting akun"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    referrerPolicy="no-referrer"
                    className="h-9 w-9 rounded-full border border-white/20 object-cover"
                    alt={displayName || "User"}
                  />
                ) : (
                  <FaUserCircle className="text-white/80 hover:text-[var(--accent-2)]" size={32} />
                )}
              </button>
            )}

            {/* MOBILE TOGGLE */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden flex w-[38px] h-[38px] items-center justify-center bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] rounded-xl text-white transition-all"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* MOBILE DROPDOWN NAV */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-white/[0.08] bg-[var(--background)] px-4 py-5 flex flex-col gap-4 animate-fadeIn">
            {/* SEARCH BAR MOBILE */}
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-2.5 text-white/40 text-xs">
              <FiSearch className="w-4 h-4 text-white/50" />
              <input
                type="text"
                placeholder="Cari game favoritmu..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="bg-transparent border-none outline-none text-white w-full text-xs placeholder-white/30"
              />
            </div>

            <nav className="flex flex-col gap-1">
              <Link
                href="/topup"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <FiHome className="w-[18px] h-[18px]" />
                <span>Beranda</span>
              </Link>
              <Link
                href="/game"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <FaGamepad className="w-[18px] h-[18px]" />
                <span>Semua Game</span>
              </Link>
              <Link
                href="/topup/lacak"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <FiSearch className="w-[18px] h-[18px]" />
                <span>Lacak Pesanan</span>
              </Link>
            </nav>

            <div className="pt-3 border-t border-white/[0.06]">
              {user ? (
                <Link
                  href="/setting"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl p-2.5 hover:bg-white/[0.07] transition-all w-full"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName || "User"}
                      className="w-8 h-8 rounded-full border border-white/20 object-cover"
                    />
                  ) : (
                    <FaUserCircle className="w-8 h-8 text-white/70" />
                  )}
                  <span className="font-bold text-sm text-white">{displayName || "Pengguna"}</span>
                </Link>
              ) : (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowLogin(true);
                  }}
                  className="w-full flex items-center justify-center font-bold text-sm text-[#1a0a06] bg-gradient-to-r from-[var(--accent-3)] to-[var(--accent)] rounded-full py-3 shadow-[0_4px_15px_rgba(244,63,94,0.2)] transition-all"
                >
                  Masuk / Daftar
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {showLogin && <LoginModal close={() => setShowLogin(false)} />}
    </>
  );
}
