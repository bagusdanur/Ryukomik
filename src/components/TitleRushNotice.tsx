"use client";

import Link from "next/link";
import { FaCrown, FaGamepad } from "react-icons/fa";

type TitleRushNoticeProps = {
  className?: string;
};

export default function TitleRushNotice({
  className = "",
}: TitleRushNoticeProps) {
  return (
    <section className={`px-3 sm:px-6 ${className}`}>
      <div className="rk-card-soft flex items-center gap-3 rounded-lg border-[var(--line-soft)] bg-[var(--surface-1)] px-3 py-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--line-strong)] bg-[color:color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-2)]">
          <FaGamepad />
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-xs font-black text-white">
            <FaCrown className="shrink-0 text-[var(--accent-2)]" size={12} />
            Event Game Mingguan
          </p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-white/60">
            Juara 1 dapat Premium 7 hari.
          </p>
        </div>

        <Link
          href="/game"
          className="rk-btn-primary inline-flex h-9 shrink-0 items-center rounded-lg px-3 text-xs font-black"
        >
          Main
        </Link>

      </div>
    </section>
  );
}
