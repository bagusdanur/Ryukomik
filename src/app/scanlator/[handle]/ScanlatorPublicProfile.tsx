"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiCalendar, FiExternalLink, FiHeart } from "react-icons/fi";
import UserBadges from "@/components/UserBadges";
import { getSession } from "@/lib/auth/getSession";

type Profile = {
  handle: string; team_name: string; bio: string | null;
  avatar_url?: string | null; owner_username?: string | null; owner_avatar_url?: string | null;
  support_dana: string | null; support_trakteer: string | null; support_tako: string | null; support_url_lain: string | null;
  status: string; created_at: string;
};

type Project = {
  slug: string; title: string; cover_url: string | null; type: string | null; latest_chapter?: number | null;
};

/** Profil publik Scanlator — gaya profil: identitas, badge, donate, daftar project. */
export default function ScanlatorPublicProfile({ handle }: { handle: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, wRes] = await Promise.all([
          fetch(`/api/scanlator/profile?handle=${encodeURIComponent(handle)}`, { cache: "no-store" }),
          fetch(`/api/scanlator/works?handle=${encodeURIComponent(handle)}`, { cache: "no-store" }),
        ]);
        if (pRes.ok) setProfile(((await pRes.json()) as { profile: Profile }).profile);
        if (wRes.ok) setProjects(((await wRes.json()) as { works: Project[] }).works || []);
        // Endpoint privat hanya mengembalikan profil milik sesi yang login (butuh Bearer).
        const { data } = await getSession();
        const token = data.session?.access_token;
        if (token) {
          const meRes = await fetch("/api/scanlator/profile", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }).catch(() => null);
          if (meRes?.ok) {
            const me = (await meRes.json()) as { profile?: { handle?: string } | null };
            if (me.profile?.handle && me.profile.handle.toLowerCase() === handle.toLowerCase()) setIsOwner(true);
          }
        }
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [handle]);

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen bg-[var(--surface-0)] px-4 pb-20 pt-16 text-white">
      <div className="mx-auto w-full max-w-2xl">{children}</div>
    </main>
  );

  if (loading) return shell(<p className="py-20 text-center text-[13px] text-white/35">Memuat…</p>);

  if (!profile) {
    return shell(
      <div className="mt-6 rounded-xl border border-white/[.07] bg-white/[.02] p-6 text-center">
        <p className="text-[13px] text-white/45">Tim tidak ditemukan.</p>
        <Link href="/" className="mt-4 inline-flex min-h-[40px] items-center rounded-lg bg-[var(--accent)] px-4 text-[12px] font-bold">Ke beranda</Link>
      </div>,
    );
  }

  const donate = [
    { label: "DANA / GoPay", url: profile.support_dana },
    { label: "Trakteer", url: profile.support_trakteer },
    { label: "Tako", url: profile.support_tako },
    { label: "Donate lain", url: profile.support_url_lain },
  ].filter((d) => d.url);

  return shell(
    <>
      <Link href="/" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/40 transition-colors hover:text-white/70">
        <FiArrowLeft size={12} /> Beranda
      </Link>

      {/* Header profil */}
      <header className="mt-3 flex items-start gap-3.5 pb-4">
        {profile.avatar_url || profile.owner_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={(profile.avatar_url || profile.owner_avatar_url) as string}
            alt={profile.team_name}
            loading="eager"
            className="h-16 w-16 shrink-0 rounded-xl border border-white/[.08] object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-white/[.08] bg-white/[.04] text-xl font-bold text-white/80">
            {profile.team_name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="truncate text-[17px] font-bold leading-tight">{profile.team_name}</h1>
            <UserBadges role="scanlator" />
          </div>
          <p className="mt-0.5 truncate text-[11px] text-white/35">@{profile.handle}</p>
          {profile.owner_username && (
            <p className="mt-1 truncate text-[11px] text-white/40">
              Dikelola oleh{" "}
              <Link
                href={`/u/${encodeURIComponent(profile.owner_username)}`}
                className="font-bold text-[var(--accent-2)] transition-colors hover:underline"
              >
                @{profile.owner_username.toLowerCase().replace(/\s+/g, "_")}
              </Link>
            </p>
          )}
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/30">
            <FiCalendar size={11} />
            Bergabung {new Date(profile.created_at).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
          </p>
        </div>
      </header>

      {isOwner && (
        <Link
          href="/scanlator"
          className="mb-4 flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] text-[12px] font-bold text-white transition-colors hover:bg-[var(--accent)]/85"
        >
          Buka Studio Scanlator
        </Link>
      )}

      {profile.bio && <p className="pb-4 text-[12px] leading-relaxed text-white/55">{profile.bio}</p>}

      {/* Statistik ringkas */}
      <div className="grid grid-cols-2 gap-2 pb-4">
        <div className="rounded-lg border border-white/[.06] bg-white/[.02] px-3 py-2.5">
          <p className="text-base font-bold leading-none">{projects.length}</p>
          <p className="mt-1 text-[10px] text-white/35">Project</p>
        </div>
        <div className="rounded-lg border border-white/[.06] bg-white/[.02] px-3 py-2.5">
          <p className="text-base font-bold leading-none">
            {projects.reduce((sum, p) => sum + (Number(p.latest_chapter) || 0), 0)}
          </p>
          <p className="mt-1 text-[10px] text-white/35">Chapter terakhir</p>
        </div>
      </div>

      {/* Donate */}
      {donate.length > 0 && (
        <section className="border-y border-white/[.06] py-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-white/60"><FiHeart size={11} className="text-rose-300" /> Dukung tim ini</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {donate.map((d) => (
              <a key={d.label} href={d.url!} target="_blank" rel="noreferrer noopener"
                className="inline-flex min-h-[32px] items-center gap-1 rounded-md border border-white/[.08] px-2.5 text-[11px] font-semibold text-white/65 transition-colors hover:bg-white/[.05] hover:text-white">
                {d.label} <FiExternalLink size={10} className="text-white/30" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Project */}
      <section className="pt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-bold">Project</h2>
          <span className="text-[11px] text-white/30">{projects.length} judul</span>
        </div>

        {projects.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-white/30">Belum ada project terbit.</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {projects.map((p) => (
              <Link key={p.slug} href={`/komik/project/${p.slug}`} className="group min-w-0">
                <div className="aspect-[3/4] overflow-hidden rounded-md bg-white/[.04]">
                  {p.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover_url} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-opacity group-hover:opacity-85" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-white/20">No cover</div>
                  )}
                </div>
                <p className="mt-1.5 truncate text-[11px] font-semibold leading-tight text-white/80">{p.title}</p>
                <p className="text-[10px] text-white/30">
                  {p.latest_chapter ? `Ch. ${p.latest_chapter}` : "Belum ada chapter"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>,
  );
}
