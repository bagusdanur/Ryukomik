"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowUpRight, FiPenTool } from "react-icons/fi";

type Group = { handle: string; team_name: string; bio: string | null; status: string };

/**
 * Blok "Grup Scanlator" di profil publik user.
 * Nama grup bisa ditekan → halaman publik grup (/scanlator/<handle>).
 * Tidak render apa pun kalau user bukan Scanlator.
 */
export default function ScanlatorGroupCard({ username }: { username: string }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/scanlator/of-user?username=${encodeURIComponent(username)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { group?: Group | null } | null) => { if (active) setGroup(j?.group || null); })
      .catch(() => undefined)
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [username]);

  if (!ready || !group) return null;

  return (
    <Link
      href={`/scanlator/${group.handle}`}
      className="mx-4 mb-3 flex items-center gap-3 rounded-lg border border-white/[.07] bg-white/[.02] px-3.5 py-3 transition-colors hover:bg-white/[.04]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--accent)]/15 text-[var(--accent-2)]">
        <FiPenTool size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-white/30">Grup Scanlator</span>
        <span className="mt-0.5 block truncate text-[12px] font-bold text-white">{group.team_name}</span>
        {group.bio && <span className="mt-0.5 block truncate text-[10px] text-white/35">{group.bio}</span>}
      </span>
      <FiArrowUpRight size={14} className="shrink-0 text-white/30" />
    </Link>
  );
}
