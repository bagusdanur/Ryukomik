"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { socialFetch } from "@/lib/social/client";

type Profile = { username: string; bio?: string | null; avatar_url?: string | null; banner_url?: string | null; show_public_reads?: boolean; show_public_comments?: boolean; show_public_join_date?: boolean };

export default function SocialProfileEditor() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { socialFetch<{ profile: Profile }>("/api/social/me/profile").then((result) => setProfile(result.profile)).catch((error) => setMessage(error.message)); }, []);
  if (!profile) return <div className="rk-card-soft rounded-2xl p-8 text-center text-sm text-white/50">{message || "Memuat profil..."}</div>;
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setProfile((current) => current ? { ...current, [key]: value } : current);

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try { await socialFetch("/api/social/me/profile", { method: "PATCH", body: JSON.stringify(profile) }); setMessage("Profil sosial berhasil disimpan."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Gagal menyimpan."); }
    finally { setSaving(false); }
  }

  return <form onSubmit={save} className="space-y-4 pb-8">
    <section className="rk-card overflow-hidden rounded-2xl">
      <div className="relative h-28 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_35%,var(--surface-2)),color-mix(in_srgb,var(--accent-2)_18%,var(--surface-0)))] sm:h-40">{profile.banner_url && <img src={profile.banner_url} alt="Preview banner" className="h-full w-full object-cover" referrerPolicy="no-referrer" />}</div>
      <div className="flex items-end justify-between gap-3 px-4 pb-4"><div><div className="-mt-9 grid h-18 w-18 place-items-center overflow-hidden rounded-full border-4 border-[var(--surface-0)] bg-[var(--surface-2)] text-xl font-black sm:h-20 sm:w-20">{profile.avatar_url ? <img src={profile.avatar_url} alt="Preview avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : profile.username?.[0]?.toUpperCase()}</div><h2 className="mt-2 text-lg font-black">{profile.username}</h2><p className="text-[10px] text-white/35">Preview profil publik</p></div><Link href={`/u/${encodeURIComponent(profile.username)}`} className="mb-1 shrink-0 rounded-full border border-white/15 px-3 py-2 text-[10px] font-bold text-white/65">Lihat profil</Link></div>
    </section>

    <section className="rk-card-soft space-y-4 rounded-2xl p-4"><h3 className="font-black">Informasi publik</h3><label className="block"><span className="mb-2 block text-xs font-bold text-white/55">Bio · maksimal 280 karakter</span><textarea value={profile.bio || ""} onChange={(event) => update("bio", event.target.value.slice(0, 280))} rows={4} placeholder="Ceritakan tentang dirimu..." className="rk-input w-full resize-none rounded-xl p-3" /><span className="mt-1 block text-right text-[10px] text-white/35">{profile.bio?.length || 0}/280</span></label><div className="grid gap-4 sm:grid-cols-2"><label className="min-w-0"><span className="mb-2 block text-xs font-bold text-white/55">URL avatar HTTPS</span><input type="url" value={profile.avatar_url || ""} onChange={(event) => update("avatar_url", event.target.value)} placeholder="https://..." className="rk-input w-full rounded-xl px-3 py-3" /></label><label className="min-w-0"><span className="mb-2 block text-xs font-bold text-white/55">URL banner HTTPS</span><input type="url" value={profile.banner_url || ""} onChange={(event) => update("banner_url", event.target.value)} placeholder="https://..." className="rk-input w-full rounded-xl px-3 py-3" /></label></div></section>

    <section className="rk-card-soft space-y-4 rounded-2xl p-4"><div><h3 className="font-black">Privasi profil</h3><p className="text-[11px] text-white/35">Pilih aktivitas yang terlihat oleh pengguna lain.</p></div>{[["show_public_reads", "Tampilkan statistik bacaan"], ["show_public_comments", "Tampilkan komentar publik"], ["show_public_join_date", "Tampilkan tanggal bergabung"]].map(([key, label]) => <label key={key} className="flex items-center justify-between gap-4 text-sm text-white/75"><span>{label}</span><input type="checkbox" checked={profile[key as keyof Profile] !== false} onChange={(event) => update(key as keyof Profile, event.target.checked as never)} className="h-5 w-5 shrink-0 accent-cyan-400" /></label>)}</section>
    {message && <p className="rounded-xl border border-white/10 p-3 text-sm text-white/70">{message}</p>}
    <button disabled={saving} className="sticky bottom-[5.25rem] z-40 w-full rounded-xl bg-[var(--accent-2)] py-3.5 text-sm font-black text-black shadow-[0_12px_30px_rgba(0,0,0,.35)] disabled:opacity-50 sm:static">{saving ? "Menyimpan..." : "Simpan perubahan"}</button>
  </form>;
}
