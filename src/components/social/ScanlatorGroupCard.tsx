"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiChevronRight, FiPenTool } from "react-icons/fi";

type Group = { handle: string; team_name: string; bio: string | null; status: string };

/**
 * Baris "Grup Scanlator" di profil publik user — tampil DI ATAS tab
 * Postingan/Koleksi/Aktivitas. Gaya menyatu dengan header profil (tanpa kartu
 * melayang), memakai token warna global.
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
      className="flex items-center gap-2.5 border-t border-white/[0.08] px-4 py-3 transition-colors hover:bg-white/[0.04]"
    >
      <FiPenTool size={13} className="shrink-0 text-[var(--accent-2)]" />
      <span className="min-w-0 flex-1 truncate text-[12px] text-white/45">
        Grup Scanlator <span className="text-white/20">·</span>{" "}
        <span className="font-bold text-white">{group.team_name}</span>
      </span>
      <FiChevronRight size={14} className="shrink-0 text-white/25" />
    </Link>
  );
}
