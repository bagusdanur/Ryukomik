"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FiMessageCircle, FiX } from "react-icons/fi";

const YUKI_EMBED_URL = "https://yuki.ryukomik.web.id/embed.html";

export default function YukiChatEmbed() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hasMobileCommunityComposer = pathname === "/feed" || pathname === "/files";

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (pathname.startsWith("/chapter") || pathname.startsWith("/novel/chapter")) {
    return null;
  }

  return (
    <aside
      className={`fixed right-2 z-[55] sm:bottom-5 sm:right-5 ${
        hasMobileCommunityComposer && !open
          ? "bottom-[calc(8.5rem+env(safe-area-inset-bottom))]"
          : "bottom-[calc(5.1rem+env(safe-area-inset-bottom))]"
      }`}
    >
      {open ? (
        <section
          role="dialog"
          aria-modal="false"
          aria-label="Chat dengan Yuki"
          className="flex h-[min(78dvh,700px)] w-[calc(100vw-16px)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[var(--surface-1)] shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:h-[min(78vh,720px)] sm:w-[440px]"
        >
          <header className="relative flex shrink-0 items-center justify-between overflow-hidden border-b border-white/[0.08] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_18%,var(--surface-1)),color-mix(in_srgb,var(--accent-2)_7%,var(--surface-1)))] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-lg shadow-violet-950/30">
                <FiMessageCircle size={20} />
                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[var(--surface-1)] bg-emerald-400" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-sm font-black text-white">Yuki</h2>
                  <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--accent-2)]">AI</span>
                </div>
                <p className="mt-0.5 truncate text-[10px] text-white/45">Asisten komik Ryukomik</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup chat Yuki"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] text-white/55 transition hover:bg-white/10 hover:text-white"
            >
              <FiX size={18} />
            </button>
          </header>

          <div className="relative min-h-0 flex-1 bg-[var(--background)]">
            <div className="absolute inset-0 flex items-center justify-center text-xs text-white/35">
              Menyiapkan Yuki...
            </div>
            <div className="absolute inset-0 z-[1] overflow-hidden bg-[var(--background)]">
              <iframe
                src={YUKI_EMBED_URL}
                title="Yuki"
                loading="lazy"
                allow="clipboard-write"
                className="h-[113.637%] w-[113.637%] origin-top-left scale-[0.88] border-0 bg-[var(--background)] sm:h-[108.696%] sm:w-[108.696%] sm:scale-[0.92]"
              />
            </div>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka chat Yuki"
          aria-expanded="false"
          className="group flex h-12 items-center gap-2 rounded-full border border-violet-300/25 bg-[color-mix(in_srgb,var(--surface-1)_92%,transparent)] p-1.5 pr-3 text-white shadow-[0_14px_38px_rgba(0,0,0,0.42)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-cyan-200/35 hover:bg-[var(--surface-2)] active:translate-y-0"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-white shadow-lg shadow-violet-950/30">
            <FiMessageCircle size={18} />
            <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface-1)] bg-emerald-400" />
          </span>
          <span className="text-xs font-black tracking-wide">Yuki</span>
        </button>
      )}
    </aside>
  );
}
