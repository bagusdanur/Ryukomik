"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Anime", href: "/anime/terbaru" },
  { label: "Donghua", href: "/donghua/terbaru" },
  { label: "Dewasa", href: "/hentai/terbaru" },
];

/** Header halaman /tonton — gaya sama dengan AnimeHeader/DonghuaHeader. */
export default function TontonHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-[var(--background)]">
      <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-4">
        <Link href="/tonton" className="flex items-center gap-2 active:opacity-70">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "#8b5cf6" }}>
            <span className="text-[13px] font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
              T
            </span>
          </div>
          <div className="leading-none">
            <span className="block text-[16px] font-black tracking-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
              Tonton<span className="text-cyan-200">.</span>
            </span>
            <span className="text-[9px] uppercase tracking-widest text-white/30">Anime · Donghua · 18+</span>
          </div>
        </Link>

        <Link
          href="/anime/search"
          className="rk-btn-ghost flex h-9 w-9 items-center justify-center rounded-2xl active:scale-90"
          aria-label="Cari anime"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-lg gap-2 overflow-x-auto px-4 pb-2">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href.split("/").slice(0, 2).join("/"));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${
                active ? "bg-white/10 text-white" : "text-white/45 hover:text-white/80"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
