"use client";

import { useEffect, useState, type FormEvent } from "react";
import { socialFetch } from "@/lib/social/client";

type Profile = {
  username: string;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  show_public_reads?: boolean;
  show_public_comments?: boolean;
  show_public_join_date?: boolean;
};

export default function SocialProfileEditor() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    socialFetch<{ profile: Profile }>("/api/social/me/profile")
      .then((result) => setProfile(result.profile))
      .catch((error) => setMessage(error.message));
  }, []);
  if (!profile)
    return (
      <div className="rk-card-soft rounded-2xl p-8 text-center text-sm text-white/50">
        {message || "Memuat profil..."}
      </div>
    );
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((current) => (current ? { ...current, [key]: value } : current));
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await socialFetch("/api/social/me/profile", {
        method: "PATCH",
        body: JSON.stringify(profile),
      });
      setMessage("Profil sosial berhasil disimpan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={save} className="space-y-5">
      <div className="rk-card overflow-hidden rounded-2xl">
        <div className="relative h-36 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_35%,var(--surface-2)),color-mix(in_srgb,var(--accent-2)_18%,var(--surface-0)))]">
          {profile.banner_url && (
            <img
              src={profile.banner_url}
              alt="Preview banner"
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          )}
        </div>
        <div className="px-4 pb-4">
          <div className="-mt-10 grid h-20 w-20 place-items-center overflow-hidden rounded-full border-4 border-[var(--surface-0)] bg-[var(--surface-2)] text-2xl font-black">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Preview avatar"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              profile.username?.[0]?.toUpperCase()
            )}
          </div>
          <h2 className="mt-2 text-lg font-black">{profile.username}</h2>
        </div>
      </div>
      <label className="block">
        <span className="mb-2 block text-xs font-bold text-white/55">
          Bio · maksimal 280 karakter
        </span>
        <textarea
          value={profile.bio || ""}
          onChange={(event) => update("bio", event.target.value.slice(0, 280))}
          rows={4}
          className="rk-input w-full rounded-xl p-3"
        />
        <span className="mt-1 block text-right text-[10px] text-white/35">
          {profile.bio?.length || 0}/280
        </span>
      </label>
      <label className="block">
        <span className="mb-2 block text-xs font-bold text-white/55">
          URL avatar HTTPS
        </span>
        <input
          type="url"
          value={profile.avatar_url || ""}
          onChange={(event) => update("avatar_url", event.target.value)}
          placeholder="https://..."
          className="rk-input w-full rounded-xl px-3 py-3"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-xs font-bold text-white/55">
          URL banner HTTPS
        </span>
        <input
          type="url"
          value={profile.banner_url || ""}
          onChange={(event) => update("banner_url", event.target.value)}
          placeholder="https://..."
          className="rk-input w-full rounded-xl px-3 py-3"
        />
      </label>
      <section className="rk-card-soft space-y-4 rounded-2xl p-4">
        <h3 className="font-black">Privasi profil</h3>
        {[
          ["show_public_reads", "Tampilkan statistik bacaan"],
          ["show_public_comments", "Tampilkan komentar publik"],
          ["show_public_join_date", "Tampilkan tanggal bergabung"],
        ].map(([key, label]) => (
          <label
            key={key}
            className="flex items-center justify-between gap-4 text-sm text-white/75"
          >
            <span>{label}</span>
            <input
              type="checkbox"
              checked={profile[key as keyof Profile] !== false}
              onChange={(event) =>
                update(key as keyof Profile, event.target.checked as never)
              }
              className="h-5 w-5 accent-cyan-400"
            />
          </label>
        ))}
      </section>
      {message && (
        <p className="rounded-xl border border-white/10 p-3 text-sm text-white/70">
          {message}
        </p>
      )}
      <button
        disabled={saving}
        className="w-full rounded-xl bg-white py-3 text-sm font-black text-black disabled:opacity-50"
      >
        {saving ? "Menyimpan..." : "Simpan profil sosial"}
      </button>
    </form>
  );
}
