"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import SwitchCategoryButton from "./SwitchCategoryButton";
const NAV_ITEMS = [
  { label: "Terbaru", href: "/donghua/terbaru" },
  { label: "Search", href: "/donghua/search" },
];

export default function DonghuaHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = NAV_ITEMS.find((n) => pathname.startsWith(n.href));

  return (
    <>
      <header className="sticky top-0 z-50 bg-[var(--background)]">
        <div className="w-full max-w-lg mx-auto px-4 flex items-center justify-between h-14">

          {/* logo */}
          <Link
            href="/donghua/terbaru"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 active:opacity-70"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#ff9f1c" }}
            >
              <span
                className="text-[13px] font-black text-black"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                D
              </span>
            </div>
            <div className="leading-none">
              <span
                className="text-[16px] font-black tracking-tight block"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Donghua<span style={{ color: "#ff9f1c" }}>.</span>
              </span>
              {active && (
                <span className="text-[9px] text-white/30 tracking-widest uppercase">
                  {active.label}
                </span>
              )}
            </div>
          </Link>

          {/* right: toggle + search + burger */}
          <div className="flex items-center gap-2">

            <SwitchCategoryButton />

            {/* Search */}
            <Link
              href="/donghua/search"
              className="rk-btn-ghost flex h-9 w-9 items-center justify-center rounded-2xl active:scale-90"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </Link>

            {/* burger */}
            <button
              onClick={() => setOpen((v) => !v)}
              className="rk-btn-ghost flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-2xl active:scale-90"
              aria-label="Menu"
            >
              <span
                className="block h-[2px] rounded-full bg-white/60 origin-center"
                style={{
                  width: open ? "14px" : "16px",
                  transform: open ? "translateY(7px) rotate(45deg)" : "none",
                }}
              />
              <span
                className="block h-[2px] rounded-full bg-white/60"
                style={{
                  width: "12px",
                  opacity: open ? 0 : 1,
                  transform: open ? "scaleX(0)" : "none",
                }}
              />
              <span
                className="block h-[2px] rounded-full bg-white/60 origin-center"
                style={{
                  width: open ? "14px" : "10px",
                  transform: open ? "translateY(-7px) rotate(-45deg)" : "none",
                }}
              />
            </button>
          </div>
        </div>
      </header>

      {/* overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* drawer */}
      <div
        className="rk-card fixed right-0 top-0 z-50 flex h-full w-64 flex-col"
        style={{
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* drawer header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/5 flex-shrink-0">
          <span
            className="text-[11px] font-black tracking-[.2em] uppercase text-white/30"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Menu
          </span>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 active:scale-90 transition-colors duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* nav items */}
        <nav className="flex flex-col gap-1 p-4 flex-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl active:scale-95 transition-colors duration-200 ${
                  isActive
                    ? "border border-[#ff9f1c]/30"
                    : "hover:bg-white/5 border border-transparent"
                }`}
                style={isActive ? { background: "rgba(255,159,28,0.1)" } : {}}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: isActive ? "#ff9f1c" : "rgba(255,255,255,0.15)" }}
                />
                <span
                  className={`text-[13px] font-bold`}
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    color: isActive ? "#ffcf77" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {item.label}
                </span>
                {isActive && (
                  <span
                    className="ml-auto text-[9px] font-bold tracking-widest uppercase"
                    style={{ color: "rgba(255,159,28,0.6)" }}
                  >
                    Aktif
                  </span>
                )}
              </Link>
            );
          })}

          {/* divider */}
          <div className="my-2 border-t border-white/5" />

          {/* link balik ke anime */}
          <Link
            href="/anime/terbaru"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 border border-transparent active:scale-95 transition-colors duration-200"
          >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--accent)" }} />
            <span
              className="text-[13px] font-bold text-white/30"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              ← Anime
            </span>
          </Link>

          {/* link ke hentai */}
          <Link
            href="/hentai/terbaru"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 border border-transparent active:scale-95 transition-colors duration-200"
          >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#ff5078" }} />
            <span
              className="text-[13px] font-bold text-white/30"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              ← Hentai
            </span>
          </Link>
        </nav>

        {/* drawer footer */}
        <div className="px-5 py-4 border-t border-white/5">
          <p className="text-[9px] text-white/15 tracking-widest uppercase">
            Ryukomik · Donghua
          </p>
        </div>
      </div>
    </>
  );
}
