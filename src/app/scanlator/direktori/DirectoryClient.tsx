"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiChevronRight, FiPenTool } from "react-icons/fi";

type Group = {
  handle: string; team_name: string; bio: string | null; avatar_url: string | null;
  status: string; projects: number; latest_update: string | null;
};

function ago(iso: string | null) {
  if (!iso) return "belum ada update";
  const diff = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

/** Direktori publik semua grup Scanlator. */
export default function DirectoryClient() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/scanlator/directory", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { groups?: Group[] } | null) => setGroups(j?.groups || []))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = groups.filter(
    (g) => !q || g.team_name.toLowerCase().includes(q.toLowerCase()) || g.handle.includes(q.toLowerCase()),
  );

  return (
    <main className="min-h-screen bg-[var(--surface-0)] px-4 pb-20 pt-16 text-white">
      <div className="mx-auto w-full max-w-2xl">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push("/files?tab=scanlator");
          }}
          className="inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-[11px] font-semibold text-white/40 transition-colors hover:text-white/75"
        >
          <FiArrowLeft size={12} /> Kembali
        </button>

        <h1 className="mt-3 text-[19px] font-bold leading-tight">User Scanlator</h1>
        <p className="mt-1 text-[12px] text-white/40">{groups.length} user terdaftar · diurutkan dari yang paling banyak project</p>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari user…"
          className="mt-3 w-full rounded-lg border border-white/[.08] bg-white/[.03] px-3 py-2.5 text-[13px] text-white placeholder:text-white/25 outline-none focus:border-[var(--accent)]/60"
        />

        <div className="mt-3 overflow-hidden rounded-xl border border-white/[.07]">
          {loading ? (
            <p className="py-10 text-center text-[12px] text-white/35">Memuat…</p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-[12px] text-white/35">Belum ada user.</p>
          ) : (
            <ul className="divide-y divide-white/[.05]">
              {filtered.map((g) => (
                <li key={g.handle}>
                  <Link href={`/scanlator/${g.handle}`} className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-white/[.03]">
                    {g.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.avatar_url} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/[.05] text-[var(--accent-2)]">
                        <FiPenTool size={15} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-white/90">{g.team_name}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-white/35">
                        @{g.handle} · {g.projects} project · {ago(g.latest_update)}
                      </span>
                    </span>
                    <FiChevronRight size={14} className="shrink-0 text-white/25" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
