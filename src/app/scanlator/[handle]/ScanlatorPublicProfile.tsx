"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiCalendar, FiCheckCircle, FiExternalLink, FiHeart, FiUser } from "react-icons/fi";
import UserBadges from "@/components/UserBadges";
import { getSession } from "@/lib/auth/getSession";

type Profile = {
  handle: string; team_name: string; bio: string | null;
  avatar_url?: string | null; owner_username?: string | null; owner_avatar_url?: string | null; verified?: boolean;
  support_dana: string | null; support_trakteer: string | null; support_tako: string | null; support_url_lain: string | null;
  status: string; created_at: string;
};

type Project = {
  slug: string; title: string; cover_url: string | null; type: string | null;
  latest_chapter?: number | null; updated_at?: string | null; latest_chapter_at?: string | null;
};

function timeAgo(iso: string | null | undefined) {
  if (!iso) return null;
  const diff = Date.now() - Date.parse(iso);
  if (!Number.isFinite(diff) || diff < 0) return null;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/** Profil publik Scanlator — rapi, flat, mengikuti warna global. */
export default function ScanlatorPublicProfile({ handle }: { handle: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followHint, setFollowHint] = useState("");

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
          const fRes = await fetch(`/api/scanlator/follow?handle=${encodeURIComponent(handle)}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }).catch(() => null);
          if (fRes?.ok) {
            const f = (await fRes.json()) as { following?: boolean };
            setFollowing(Boolean(f.following));
          }
        }
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [handle]);

  /** Kembali ke halaman sebelumnya; kalau dibuka langsung, ke daftar grup. */
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/files?tab=scanlator");
  };

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen bg-[var(--surface-0)] px-4 pb-24 pt-16 text-white">
      <div className="mx-auto w-full max-w-2xl">{children}</div>
    </main>
  );

  const backBar = (
    <button
      type="button"
      onClick={goBack}
      className="mb-3 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-[11px] font-semibold text-white/40 transition-colors hover:text-white/75"
    >
      <FiArrowLeft size={13} /> Kembali
    </button>
  );

  if (loading) return shell(<>{backBar}<p className="py-20 text-center text-[13px] text-white/35">Memuat…</p></>);

  if (!profile) {
    return shell(
      <>
        {backBar}
        <div className="rounded-xl border border-white/[.07] bg-white/[.02] px-5 py-10 text-center">
          <p className="text-[13px] text-white/45">Tim tidak ditemukan.</p>
          <Link
            href="/files?tab=scanlator"
            className="mt-4 inline-flex min-h-[38px] items-center rounded-lg border border-white/[.1] px-4 text-[12px] font-bold text-white/75"
          >
            Lihat daftar grup
          </Link>
        </div>
      </>,
    );
  }

  const toggleFollow = async () => {
    if (followBusy) return;
    setFollowBusy(true); setFollowHint("");
    try {
      const { data } = await getSession();
      const token = data.session?.access_token;
      if (!token) { setFollowHint("Masuk dulu untuk mengikuti grup ini."); return; }
      const next = !following;
      const res = await fetch("/api/scanlator/follow", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ handle: profile?.handle, follow: next }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setFollowHint(json?.error || "Gagal menyimpan."); return; }
      setFollowing(next);
      setFollowHint(next ? "Kamu akan dapat notifikasi chapter baru dari tim ini." : "Berhenti mengikuti.");
    } catch {
      setFollowHint("Gagal menyimpan.");
    } finally {
      setFollowBusy(false);
    }
  };

  const donate = [
    { label: "DANA / GoPay", url: profile.support_dana },
    { label: "Trakteer", url: profile.support_trakteer },
    { label: "Tako", url: profile.support_tako },
    { label: "Donate lain", url: profile.support_url_lain },
  ].filter((d) => d.url);

  const lastUpdate = projects
    .map((p) => p.latest_chapter_at || p.updated_at || null)
    .filter((v): v is string => Boolean(v))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;

  return shell(
    <>
      {backBar}

      {/* Identitas tim */}
      <header className="rounded-xl border border-white/[.07] bg-white/[.02] p-4">
        <div className="flex items-start gap-3.5">
          {profile.avatar_url || profile.owner_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(profile.avatar_url || profile.owner_avatar_url) as string}
              alt={profile.team_name}
              loading="eager"
              className="h-14 w-14 shrink-0 rounded-lg border border-white/[.08] object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-white/[.08] bg-white/[.04] text-lg font-black text-white/70">
              {profile.team_name.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="truncate text-[16px] font-bold leading-tight text-white">{profile.team_name}</h1>
              {profile.verified && (
                <span
                  className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--accent-2)]"
                  style={{ borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)" }}
                  title="Tim terverifikasi"
                >
                  <FiCheckCircle size={9} /> Terverifikasi
                </span>
              )}
              <UserBadges role="scanlator" />
            </div>
            <p className="mt-0.5 truncate text-[11px] text-white/35">@{profile.handle}</p>
            {profile.owner_username && (
              <Link
                href={`/u/${encodeURIComponent(profile.owner_username)}`}
                className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[11px] text-white/40 transition-colors hover:text-white/70"
              >
                <FiUser size={10} className="shrink-0" />
                <span className="truncate">{profile.owner_username}</span>
              </Link>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 border-t border-white/[.06] pt-2.5 text-[10.5px] text-white/45">
          <span className="inline-flex items-center gap-1">
            <FiCalendar size={10} />
            {new Date(profile.created_at).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
          </span>
          <span className="h-2.5 w-px bg-white/10" />
          <span><strong className="font-bold text-white/70">{projects.length}</strong> seri</span>
          {timeAgo(lastUpdate) && (
            <>
              <span className="h-2.5 w-px bg-white/10" />
              <span>Update <strong className="font-bold text-white/70">{timeAgo(lastUpdate)}</strong></span>
            </>
          )}
        </div>
      </header>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void toggleFollow()}
          disabled={followBusy}
          className={`min-h-[36px] flex-1 rounded-lg border text-[12px] font-bold transition-colors ${
            following
              ? "border-white/[.1] bg-white/[.05] text-white/75"
              : "border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-white"
          }`}
        >
          {followBusy ? "Menyimpan…" : following ? "Diikuti" : "Ikuti grup"}
        </button>
        {isOwner && (
          <Link
            href="/scanlator"
            className="min-h-[36px] flex-1 rounded-lg border border-white/[.1] text-center text-[12px] font-bold leading-[34px] text-white/80"
          >
            Studio
          </Link>
        )}
      </div>
      {followHint && <p className="mt-1.5 px-1 text-[10.5px] text-white/40">{followHint}</p>}

      {profile.bio && (
        <p className="px-1 pb-1 pt-3 text-[12px] leading-relaxed text-white/60">{profile.bio}</p>
      )}

      {donate.length > 0 && (
        <section className="mt-3">
          <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-white/30">
            <FiHeart size={10} /> Dukung tim
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {donate.map((d) => (
              <a
                key={d.label}
                href={d.url!}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-h-[32px] shrink-0 items-center gap-1 rounded-md border px-2.5 text-[11px] font-semibold text-white/80 transition-colors active:opacity-80"
                style={{
                  borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
                  background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                }}
              >
                {d.label}
                <FiExternalLink size={9} className="text-white/40" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Karya */}
      <section className="pt-5">
        <div className="mb-2.5 flex items-baseline justify-between px-1">
          <h2 className="text-[13px] font-bold text-white">Seri terbit</h2>
          <span className="text-[10.5px] text-white/30">{projects.length} judul</span>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-white/[.07] bg-white/[.02] px-4 py-10 text-center">
            <p className="text-[12px] text-white/35">Belum ada seri terbit.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {projects.map((p) => (
              <Link key={p.slug} href={`/komik/project/${p.slug}`} className="group min-w-0">
                <div className="aspect-[3/4] overflow-hidden rounded-lg border border-white/[.06] bg-white/[.03]">
                  {p.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.cover_url}
                      alt={p.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-opacity group-hover:opacity-85"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-white/20">Tanpa cover</div>
                  )}
                </div>
                <p className="mt-1.5 truncate text-[11px] font-semibold leading-tight text-white/80">{p.title}</p>
                <p className="text-[10px] text-white/35">
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
