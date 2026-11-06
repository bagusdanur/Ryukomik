"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiBookOpen, FiCheckCircle, FiClock, FiPlus, FiUsers } from "react-icons/fi";

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
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hri`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/** Section User Scanlator di homepage — horizontal scroll, setelah Project Update. */
export default function ScanlatorHomeSection() {
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/scanlator/directory", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { groups?: Group[] }) => {
        if (!alive) return;
        setGroups((j.groups || []).filter((g) => g.status !== "revoked").slice(0, 10));
      })
      .catch(() => null);
    return () => { alive = false; };
  }, []);

  if (!groups.length) return null;
  const cards = groups.slice(0, 8);

  return (
    <section className="mt-8 px-3 sm:px-6" aria-label="User Scanlator">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200/60">Komunitas</p>
          <h2 className="rk-section-title mt-0.5 text-xl font-black leading-tight">User Scanlator</h2>
          <p className="mt-1 text-[11px] text-white/35">Akun yang menerbitkan hasil TL sendiri di sini.</p>
        </div>
        <Link
          href="/files?tab=scanlator"
          className="mt-1 shrink-0 rounded-full border border-white/[.09] bg-white/[.03] px-3.5 py-1.5 text-[11px] font-bold text-white/70 transition-colors hover:border-violet-200/40 hover:text-white"
        >
          Lihat Semua
        </Link>
      </div>

      <div className="-mx-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0 no-scrollbar">
        <div className="flex items-stretch gap-3">
          {cards.map((g) => {
            const updated = timeAgo(g.latest_update);
            return (
              <Link
                key={g.handle}
                href={`/scanlator/${g.handle}`}
                className="group relative flex w-[185px] shrink-0 flex-col overflow-hidden rounded-xl border border-white/[.07] bg-[#15151c] transition-colors hover:border-white/[.12] hover:bg-[#191923] sm:w-[195px]"
              >
                {/* top inset accent */}
                <div className="h-[3px] w-full bg-[var(--accent)]/70" aria-hidden />

                <div className="flex flex-1 flex-col p-3.5">
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      {g.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={g.avatar_url}
                          alt={g.team_name}
                          loading="lazy"
                          className="h-11 w-11 rounded-lg border border-white/[.08] object-cover"
                        />
                      ) : (
                        <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/[.08] bg-white/[.05] text-[15px] font-black text-white/70">
                          {(g.team_name || "?").slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      {g.verified && (
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#15151c] text-[var(--accent-2)]">
                          <FiCheckCircle size={13} />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="truncate text-[13px] font-bold leading-tight text-white">{g.team_name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-white/35">@{g.handle}</p>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 h-[28px] text-[11px] leading-snug text-white/45">
                    {g.bio?.trim() || "Belum ada bio. Lihat karya dan project mereka."}
                  </p>

                  <div className="mt-3 flex items-center gap-1.5 border-t border-white/[.06] pt-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/[.05] px-2 py-1 text-[10px] font-semibold text-white/60">
                      <FiBookOpen size={10} /> {g.projects} seri
                    </span>
                    {updated && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-white/35">
                        <FiClock size={9} /> {updated}
                      </span>
                    )}
                    <span className="ml-auto text-[11px] font-bold text-[var(--accent-2)] opacity-0 transition-opacity group-hover:opacity-100">
                      Lihat →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* CTA card */}
          <Link
            href="/scanlator/daftar"
            className="flex w-[185px] shrink-0 flex-col items-center justify-center gap-2 min-h-[132px] rounded-xl border border-dashed border-white/[.14] bg-white/[.015] p-4 text-center transition-colors hover:border-[var(--accent)]/45 hover:bg-white/[.03] sm:w-[195px]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent-2)]">
              <FiPlus size={18} />
            </span>
            <span className="text-[12px] font-bold leading-tight text-white/85">
              Daftar jadi
              <br />
              Scanlator
            </span>
            <span className="px-2 text-[10px] leading-snug text-white/35">
              Upload hasil TL kamu sendiri
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
