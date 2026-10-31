"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  ADULT_PREF_EVENT,
  isAdultHidden,
  setAdultHidden,
} from "@/utils/adultFilter";

/**
 * Toggle "Sembunyikan konten 18+".
 * Saat aktif: sumber adult hilang dari pemilih sumber, section Dewasa di
 * /tonton tidak dirender, dan /hentai dialihkan ke /tonton.
 */
export default function AdultFilterToggle() {
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHidden(isAdultHidden());
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      setHidden(typeof detail === "boolean" ? detail : isAdultHidden());
    };
    window.addEventListener(ADULT_PREF_EVENT, sync);
    return () => window.removeEventListener(ADULT_PREF_EVENT, sync);
  }, []);

  const toggle = () => {
    const next = !hidden;
    setHidden(next);
    setAdultHidden(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-white/[0.06]"
      aria-pressed={mounted ? hidden : undefined}
    >
      <span className="flex min-w-0 items-center gap-3">
        {hidden ? (
          <EyeOff className="shrink-0 text-white/70" size={16} />
        ) : (
          <Eye className="shrink-0 text-white/70" size={16} />
        )}
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white">
            Sembunyikan konten 18+
          </span>
          <span className="mt-0.5 block text-xs text-white/45">
            Sumber dewasa dan tab Hentai tidak ditampilkan selama filter aktif.
          </span>
        </span>
      </span>

      <span
        className={`relative ml-3 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          hidden ? "bg-cyan-500" : "bg-white/15"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            hidden ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}
