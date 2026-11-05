"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiBookOpen, FiClock, FiExternalLink, FiHeart } from "react-icons/fi";

type Profile = {
  handle: string; team_name: string; bio: string | null;
  support_dana: string | null; support_trakteer: string | null; support_tako: string | null; support_url_lain: string | null;
  created_at: string;
};

type Work = { slug: string; title: string; cover_url: string | null; type: string | null; latest_chapter?: number | null };

/** Halaman publik tim Scanlator: bio, tautan donate, daftar karya. */
export default function ScanlatorPublicProfile({ handle }: { handle: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, wRes] = await Promise.all([
          fetch(`/api/scanlator/profile?handle=${encodeURIComponent(handle)}`, { cache: "no-store" }),
          fetch(`/api/scanlator/works?handle=${encodeURIComponent(handle)}`, { cache: "no-store" }),
        ]);
        if (pRes.ok) setProfile(((await pRes.json()) as { profile: Profile }).profile);
        if (wRes.ok) setWorks(((await wRes.json()) as { works: Work[] }).works || []);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [handle]);

  if (loading) return <main className="rk-page rk-app-surface px-4 pb-24 pt-20 text-white"><p className="py-16 text-center text-sm" style={{ color: "var(--muted)" }}>Memuat…</p></main>;

  if (!profile) return (
    <main className="rk-page rk-app-surface px-4 pb-24 pt-20 text-white">
      <div className="rk-state mx-auto max-w-md rounded-3xl px-5 py-12 text-center">
        <p className="text-sm text-white/50">Tim tidak ditemukan.</p>
        <Link href="/" className="rk-btn-primary mt-4 inline-block rounded-full px-5 py-2 text-sm font-bold">Kembali ke Beranda</Link>
      </div>
    </main>
  );

  const donate = [
    { label: "DANA / GoPay", url: profile.support_dana },
    { label: "Trakteer", url: profile.support_trakteer },
    { label: "Tako", url: profile.support_tako },
    { label: "Donate lain", url: profile.support_url_lain },
  ].filter((d) => d.url);

  return (
    <main className="rk-page rk-app-surface px-4 pb-24 pt-20 text-white">
      <div className="mx-auto max-w-2xl space-y-4">
        <header className="rk-card rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl rk-gradient text-2xl font-black text-white">
              {profile.team_name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black">{profile.team_name}</h1>
              <p className="text-xs text-white/45">@{profile.handle} · Scanlator Ryukomik · sejak {new Date(profile.created_at).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</p>
            </div>
          </div>
          {profile.bio && <p className="mt-4 text-sm leading-relaxed text-white/60">{profile.bio}</p>}
        </header>

        {donate.length > 0 && (
          <section className="rk-card-soft rounded-3xl p-5">
            <p className="flex items-center gap-2 text-sm font-black"><FiHeart size={15} className="text-rose-300" /> Dukung {profile.team_name}!</p>
            <p className="mt-1 text-xs text-white/45">Tautan keluar dari Ryukomik langsung ke akun donate tim ini.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {donate.map((d) => (
                <a key={d.label} href={d.url!} target="_blank" rel="noreferrer noopener" className="flex items-center justify-between rounded-2xl bg-white/[.04] px-4 py-3 text-xs font-bold text-white/80 transition hover:bg-white/[.08]">
                  {d.label} <FiExternalLink size={12} className="text-white/40" />
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="rk-card-soft rounded-3xl p-5">
          <p className="flex items-center gap-2 text-sm font-black"><FiBookOpen size={15} className="text-[var(--accent-2)]" /> Karya ({works.length})</p>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {works.map((w) => (
              <Link key={w.slug} href={`/komik/project/${w.slug}`} className="group min-w-0">
                <div className="aspect-[3/4] overflow-hidden rounded-xl bg-white/[.04]">
                  {w.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.cover_url} alt={w.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/25"><FiBookOpen size={18} /></div>
                  )}
                </div>
                <p className="mt-1.5 truncate text-xs font-bold text-white/85">{w.title}</p>
                <p className="flex items-center gap-1 text-[10px] text-white/40">
                  <FiClock size={10} /> {w.latest_chapter ? `Ch. ${w.latest_chapter}` : "Belum ada chapter"}
                </p>
              </Link>
            ))}
          </div>
          {works.length === 0 && <p className="py-8 text-center text-xs text-white/40">Belum ada karya terbit.</p>}
        </section>
      </div>
    </main>
  );
}
