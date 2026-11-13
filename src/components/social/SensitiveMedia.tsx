"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { ADULT_PREF_EVENT, isAdultHidden } from "@/utils/adultFilter";

/**
 * Pembungkus gambar postingan bertanda 18+.
 *
 * Aturan:
 * - Postingan milik sendiri → tampil normal (penulis harus bisa mengecek).
 * - Viewer dengan filter 18+ AKTIF (default) → blur + "Ketuk untuk lihat".
 * - Viewer yang sudah mematikan filter 18+ → tampil normal + badge 18+.
 * - Reveal disimpan per postingan sampai tengah malam, bukan sekali untuk semua.
 */

const revealKeyFor = (postId: string) =>
  `rk-post-reveal:${postId}:${new Date().toLocaleDateString("en-CA")}`;
const REVEAL_EVENT = "rk-post-reveal";

function revealedToday(postId: string) {
  try {
    const stored = localStorage.getItem(revealKeyFor(postId));
    return stored !== null && Number(stored) > Date.now();
  } catch {
    return false;
  }
}

function rememberReveal(postId: string) {
  try {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    localStorage.setItem(revealKeyFor(postId), String(midnight.getTime()));
    window.dispatchEvent(new CustomEvent(REVEAL_EVENT, { detail: postId }));
  } catch {
    /* storage diblokir — reveal tetap berlaku untuk sesi ini */
  }
}

type Props = {
  postId: string;
  sensitive?: boolean;
  owned?: boolean;
  /** Kelas pembungkus (mis. rounded-2xl). */
  className?: string;
  children: ReactNode;
};

export default function SensitiveMedia({ postId, sensitive = false, owned = false, className = "", children }: Props) {
  const [hidden, setHidden] = useState(true);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setHidden(isAdultHidden());
    setRevealed(revealedToday(postId));
    const syncPref = () => setHidden(isAdultHidden());
    const syncReveal = (event: Event) => {
      if ((event as CustomEvent<string>).detail === postId) setRevealed(true);
    };
    window.addEventListener(ADULT_PREF_EVENT, syncPref);
    window.addEventListener(REVEAL_EVENT, syncReveal);
    return () => {
      window.removeEventListener(ADULT_PREF_EVENT, syncPref);
      window.removeEventListener(REVEAL_EVENT, syncReveal);
    };
  }, [postId]);

  if (!sensitive) return <>{children}</>;

  // Penulis selalu melihat miliknya sendiri; viewer yang mengizinkan 18+ juga bebas.
  const mask = hidden && !owned && !revealed;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className={mask ? "blur-xl brightness-[.45] scale-[1.02]" : ""} aria-hidden={mask}>
        {children}
      </div>

      {!mask && (
        <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-md border border-rose-400/30 bg-black/60 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-rose-200">
          18+
        </span>
      )}

      {mask && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            rememberReveal(postId);
            setRevealed(true);
          }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-black/30 px-2 text-center text-white"
          aria-label="Tampilkan gambar bertanda 18+"
        >
          <FiEyeOff size={20} />
          <span className="text-[11px] font-black">18+</span>
          <span className="flex items-center gap-1 text-[9px] font-semibold text-white/70">
            <FiEye size={10} /> Ketuk untuk lihat
          </span>
        </button>
      )}
    </div>
  );
}
