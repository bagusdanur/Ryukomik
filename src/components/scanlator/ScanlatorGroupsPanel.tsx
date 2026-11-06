"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiBookOpen, FiCheckCircle, FiChevronRight, FiClock, FiUsers } from "react-icons/fi";

type Group = {
  handle: string;
  team_name: string;
  bio: string | null;
  avatar_url: string | null;
  status: string;
  verified?: boolean;
  projects: number;
  latest_update: string | null;
};

function timeAgo(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diff) || diff < 0) return null;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/** Daftar grup Scanlator di Komunitas — bisa dibuka ke profil publiknya. */
export default function ScanlatorGroupsPanel() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/scanlator/directory", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { groups?: Group[] }) => { if (alive) setGroups(j.groups || []); })
      .catch(() => null)
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) {
    return <div className="rk-card-soft rounded-xl p-6 text-center text-[12px] text-white/35">Memuat grup…</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-0.5">
        <FiUsers size={13} className="text-[var(--accent-2)]" />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
          {groups.length} grup scanlator
        </p>
        <Link href="/scanlator/direktori" className="ml-auto text-[10px] font-semibold text-[var(--accent-2)]">
          Direktori
        </Link>
      </div>

      {groups.length === 0 && (
        <div className="rounded-xl border border-white/[.07] bg-white/[.02] px-4 py-8 text-center">
          <p className="text-[12px] text-white/40">Belum ada grup Scanlator.</p>
          <Link href="/scanlator/daftar" className="mt-2 inline-block text-[11px] font-bold text-[var(--accent-2)]">
            Daftar jadi Scanlator
          </Link>
        </div>
      )}

      <ul className="divide-y divide-white/[.06] overflow-hidden rounded-xl border border-white/[.07] bg-white/[.02]">
        {groups.map((g) => (
          <li key={g.handle}>
            <Link href={`/scanlator/${g.handle}`} className="flex items-center gap-3 px-3 py-3 transition-colors active:bg-white/[.03]">
              {g.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.avatar_url} alt={g.team_name} loading="lazy" className="h-10 w-10 shrink-0 rounded-lg border border-white/[.08] object-cover" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[.08] bg-white/[.04] text-[13px] font-bold text-white/50">
                  {g.team_name.slice(0, 1).toUpperCase()}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-[12.5px] font-bold text-white/90">
                  {g.team_name}
                  {g.verified && <FiCheckCircle size={11} className="shrink-0 text-[var(--accent-2)]" />}
                  {g.status === "suspended" && <span className="text-[9px] font-bold text-amber-300/80">suspend</span>}
                </p>
                <p className="truncate text-[10.5px] text-white/35">@{g.handle}</p>
                <p className="mt-0.5 flex items-center gap-2 text-[10px] text-white/40">
                  <span className="inline-flex items-center gap-1">
                    <FiBookOpen size={9} /> {g.projects} seri
                  </span>
                  {timeAgo(g.latest_update) && (
                    <span className="inline-flex items-center gap-1">
                      <FiClock size={9} /> {timeAgo(g.latest_update)}
                    </span>
                  )}
                </p>
              </div>

              <FiChevronRight size={15} className="shrink-0 text-white/20" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
