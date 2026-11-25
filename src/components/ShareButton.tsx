"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { FiCheck, FiCopy, FiShare2 } from "react-icons/fi";
import { buildCanonicalUrl, shareOrCopy } from "@/utils/shareLink";

type ShareButtonProps = {
  title: string;
  text?: string;
  /** Path relatif (mis. "/komik/kiryuu/slug") atau URL penuh. Default: halaman aktif. */
  path?: string;
  variant?: "pill" | "icon";
  label?: string;
  className?: string;
};

export default function ShareButton({
  title,
  text,
  path,
  variant = "pill",
  label = "Bagikan",
  className = "",
}: ShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "shared" | "copied" | "error">("idle");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  async function handleShare(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const targetUrl = path
      ? path.startsWith("http")
        ? path
        : buildCanonicalUrl(path)
      : typeof window !== "undefined"
        ? window.location.href
        : "https://ryukomik.com";

    const result = await shareOrCopy({ title, text, url: targetUrl });
    if (result === "cancelled") return;

    setStatus(result);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setStatus("idle"), 1800);
  }

  const isDone = status === "shared" || status === "copied";
  const displayLabel =
    status === "shared"
      ? "Dibagikan"
      : status === "copied"
        ? "Link Disalin"
        : status === "error"
          ? "Gagal Salin"
          : label;

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleShare}
        aria-label={displayLabel}
        title={displayLabel}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition active:scale-95 ${
          isDone
            ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
            : "border-white/15 bg-white/[0.06] text-white/80 hover:border-white/30 hover:bg-white/10 hover:text-white"
        } ${className}`}
      >
        {isDone ? <FiCheck className="text-sm" /> : status === "error" ? <FiCopy className="text-sm" /> : <FiShare2 className="text-sm" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={displayLabel}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition active:scale-95 ${
        isDone
          ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
          : "border-white/10 bg-white/[0.06] text-white/80 hover:border-[var(--accent-2)]/25 hover:bg-white/10 hover:text-[var(--accent-2)]"
      } ${className}`}
    >
      {isDone ? <FiCheck className="text-xs" /> : status === "error" ? <FiCopy className="text-xs" /> : <FiShare2 className="text-xs" />}
      {displayLabel}
    </button>
  );
}
