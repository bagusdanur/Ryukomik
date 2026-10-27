"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Anime", href: "/anime/terbaru", color: "#22d3ee" },
  { label: "Donghua", href: "/donghua/terbaru", color: "#ff9f1c" },
  { label: "Dewasa", href: "/hentai/terbaru", color: "#ff5078" },
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

      <div className="mx-auto grid w-full max-w-lg grid-cols-3 gap-2 px-4 pb-3">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href.split("/").slice(0, 2).join("/"));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[12px] font-black transition active:scale-95 ${
                active ? "text-white" : "text-white/80 hover:text-white"
              }`}
              style={{
                borderColor: active ? tab.color : `${tab.color}55`,
                background: active ? `${tab.color}26` : `${tab.color}12`,
                boxShadow: active ? `inset 0 0 0 1px ${tab.color}66` : undefined,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: tab.color }} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
