"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiBookOpen, FiCheckCircle, FiUsers } from "react-icons/fi";

type Group = {
  handle: string;
  team_name: string;
  avatar_url: string | null;
  status: string;
  verified?: boolean;
  projects: number;
};

/** Section User Scanlator di homepage — horizontal scroll, setelah Project Update. */
export default function ScanlatorHomeSection() {
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/scanlator/directory", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { groups?: Group[] }) => {
        if (!alive) return;
        const list = (j.groups || [])
          .filter((g) => g.status !== "revoked")
          .slice(0, 8);
        setGroups(list);
      })
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, []);

  if (!groups.length) return null;

  const cards = groups.slice(0, 8);

  return (
    <section className="mt-7 px-3 sm:px-6" aria-label="User Scanlator">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[.08] bg-white/[.03] text-[var(--accent-2)]">
            <FiUsers size={13} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200/60">Komunitas</p>
            <h2 className="rk-section-title text-xl font-black">User Scanlator</h2>
          </div>
        </div>
        <Link
          href="/files?tab=scanlator"
          className="rk-chip rounded-full px-3 py-1.5 text-xs font-bold transition-colors hover:border-violet-200/40 hover:text-violet-100"
        >
          Lihat Semua
        </Link>
      </div>

      <div className="no-scrollbar overflow-x-auto pb-3">
        <div className="grid auto-cols-[150px] grid-flow-col gap-3 sm:auto-cols-[170px]">
          {cards.map((g) => (
            <Link
              key={g.handle}
              href={`/scanlator/${g.handle}`}
              className="group w-[150px] rounded-xl border border-white/[.07] bg-white/[.02] p-3 transition-colors hover:bg-white/[.04] sm:w-[170px]"
            >
              <div className="flex items-center gap-2.5">
                {g.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.avatar_url}
                    alt={g.team_name}
                    loading="lazy"
                    className="h-10 w-10 shrink-0 rounded-lg border border-white/[.08] object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[.08] bg-white/[.04] text-[13px] font-bold text-white/50">
                    {g.team_name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-[12px] font-bold leading-tight text-white/90">
                    <span className="truncate">{g.team_name}</span>
                    {g.verified && <FiCheckCircle size={11} className="shrink-0 text-[var(--accent-2)]" />}
                  </p>
                  <p className="truncate text-[10px] text-white/35">@{g.handle}</p>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] text-white/45">
                  <FiBookOpen size={9} /> {g.projects} seri
                </span>
                <span className="text-[10px] font-semibold text-[var(--accent-2)] opacity-0 transition-opacity group-hover:opacity-100">
                  Lihat →
                </span>
              </div>
            </Link>
          ))}

          <Link
            href="/scanlator/daftar"
            className="flex w-[150px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[.12] bg-white/[.015] p-3 text-center transition-colors hover:bg-white/[.03] sm:w-[170px]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent-2)]">
              <FiUsers size={14} />
            </span>
            <span className="text-[11px] font-bold leading-tight text-white/75">
              Daftar jadi
              <br />
              Scanlator
            </span>
            <span className="text-[9px] text-white/35">Upload hasil TL kamu</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
