"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const CATEGORIES = [
  {
    key: "anime",
    label: "Anime",
    path: "/anime/terbaru",
    letter: "A",
    color: "#8b5cf6",
    badge: "✦",
    badgeBg: "#8b5cf6",
    badgeColor: "#fff",
    desc: "Anime Jepang",
  },
  {
    key: "donghua",
    label: "Donghua",
    path: "/donghua/terbaru",
    letter: "D",
    color: "#22d3ee",
    badge: "✦",
    badgeBg: "#22d3ee",
    badgeColor: "#061018",
    desc: "Animasi China",
  },
  {
    key: "hentai",
    label: "Hentai",
    path: "/hentai/terbaru",
    letter: "18",
    color: "#f43f5e",
    badge: "18+",
    badgeBg: "#f43f5e",
    badgeColor: "#fff",
    desc: "Konten Dewasa",
  },
] as const;

type Category = (typeof CATEGORIES)[number];

export default function SwitchCategoryButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Detect active category from pathname
  const active =
    CATEGORIES.find((c) => pathname?.startsWith(c.path.split("/terbaru")[0])) ??
    CATEGORIES[0];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (cat: Category) => {
    setOpen(false);
    router.push(cat.path);
  };

  return (
    <div className="relative" ref={ref}>
      {/* ── Trigger Button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Ganti Kategori"
        className="relative w-9 h-9 rounded-xl bg-[#1c1c1c] border border-white/5 flex items-center justify-center active:scale-90 group"
        style={{
          borderColor: open ? `${active.color}55` : undefined,
        }}
      >
        {/* Letter */}
        <span
          className="text-[11px] font-black relative z-10"
          style={{
            fontFamily: "'Syne', sans-serif",
            color: open ? active.color : "rgba(255,255,255,0.4)",
          }}
        >
          {active.letter}
        </span>

        {/* Badge */}
        <span
          className="absolute -top-1 -right-1 z-20 min-w-[12px] h-3 rounded-full flex items-center justify-center text-[6px] font-black px-[3px]"
          style={{
            background: active.badgeBg,
            color: active.badgeColor,
          }}
        >
          {active.badge}
        </span>

        {/* Chevron indicator */}
        <span
          className="absolute -bottom-[3px] left-1/2 -translate-x-1/2"
          style={{ transform: `translateX(-50%) rotate(${open ? "180deg" : "0deg"})` }}
        >
          <svg width="6" height="4" viewBox="0 0 6 4" fill="none">
            <path d="M1 1L3 3L5 1" stroke={active.color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
          </svg>
        </span>
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          className="absolute right-0 top-11 z-50 rounded-2xl overflow-hidden"
          style={{
            background: "#161616",
            border: "1px solid rgba(255,255,255,0.07)",
            minWidth: 160,
          }}
        >
          {/* header */}
          <div className="px-3 pt-2.5 pb-1.5 border-b border-white/5">
            <span
              className="text-[8px] font-black tracking-[.2em] uppercase text-white/25"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Pilih Kategori
            </span>
          </div>

          {/* options */}
          <div className="py-1">
            {CATEGORIES.map((cat) => {
              const isActive = cat.key === active.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => handleSelect(cat)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 group/item"
                  style={{
                    background: isActive ? `${cat.color}12` : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* icon circle */}
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-black"
                    style={{
                      background: isActive ? `${cat.color}20` : "rgba(255,255,255,0.05)",
                      color: isActive ? cat.color : "rgba(255,255,255,0.3)",
                      fontFamily: "'Syne', sans-serif",
                      border: isActive ? `1px solid ${cat.color}30` : "1px solid transparent",
                    }}
                  >
                    {cat.letter}
                  </div>

                  {/* text */}
                  <div className="text-left leading-none">
                    <p
                      className="text-[11px] font-bold mb-0.5"
                      style={{ color: isActive ? cat.color : "rgba(255,255,255,0.75)" }}
                    >
                      {cat.label}
                    </p>
                    <p className="text-[9px] text-white/25">{cat.desc}</p>
                  </div>

                  {/* active dot */}
                  {isActive && (
                    <div
                      className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background: cat.color,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
