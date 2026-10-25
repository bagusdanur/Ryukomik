"use client";

import UserAvatar from "@/components/UserAvatar";
import { AVATAR_BORDERS, isAdminOnlyBorder, resolveAvatarBorder } from "@/lib/avatarBorders";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { socialFetch } from "@/lib/social/client";

type Profile = {
  username: string;
  bio?: string | null;
  avatar_url?: string | null;
  avatar_border?: string | null;
  banner_url?: string | null;
};

export default function SocialProfileEditor() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    socialFetch<{ profile: Profile; is_admin?: boolean }>("/api/social/me/profile")
      .then((result) => {
        setProfile(result.profile);
        setIsAdmin(Boolean(result.is_admin));
      })
      .catch((error) => setMessage(error.message));
  }, []);

  if (!profile) {
    return (
      <div className="rk-card-soft rounded-2xl p-8 text-center text-sm text-white/50">
        {message || "Memuat profil..."}
      </div>
    );
  }

  const update = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((current) => (current ? { ...current, [key]: value } : current));

  // Border yang terkunci hanya muncul untuk admin; server tetap menolak (403)
  // kalau user biasa mengirim id-nya langsung.
  const availableBorders = Object.values(AVATAR_BORDERS).filter(
    (border) => isAdmin || !isAdminOnlyBorder(border.id),
  );

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await socialFetch("/api/social/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ bio: profile?.bio, banner_url: profile?.banner_url, avatar_border: profile?.avatar_border ?? null }),
      });
      setMessage("Profil sosial berhasil disimpan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5 pb-24">
      <div className="rk-card overflow-hidden rounded-2xl">
        <div className="relative h-24 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_35%,var(--surface-2)),color-mix(in_srgb,var(--accent-2)_18%,var(--surface-0)))]">
          {profile.banner_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.banner_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          )}
          <div className="absolute inset-0 bg-black/25" />
        </div>

        {/* Ruang khusus avatar: tinggi tetap supaya frame besar (sampai ~2x)
            tetap muat dan tidak menimpa judul di atasnya. */}
        <div className="-mt-10 flex h-52 items-center justify-center">
          <UserAvatar
            src={profile.avatar_url}
            name={profile.username}
            size={88}
            border={profile.avatar_border}
            alt="Pratinjau avatar"
          />
        </div>

        <div className="-mt-6 px-4 pb-4 text-center">
          <h2 className="text-lg font-black">{profile.username}</h2>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
            Pratinjau border
          </p>
        </div>
      </div>

      <div className="rk-card-soft rounded-2xl border border-cyan-300/10 p-4 text-sm leading-relaxed text-white/60">
        Nama, avatar, role, dan level mengikuti akun utama dan tersinkron otomatis. Ubah data tersebut melalui{" "}
        <Link href="/setting" className="font-bold text-cyan-200 hover:text-cyan-100">pengaturan akun</Link>.
      </div>

      <div className="rk-card-soft rounded-2xl p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-xs font-bold text-white/55">Border avatar</p>
          <p className="text-[10px] text-white/30">{availableBorders.length} pilihan</p>
        </div>

        {(["css", "image"] as const).map((kind) => (
          <div key={kind} className="mb-4 last:mb-0">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
              {kind === "css" ? "Warna" : "Frame"}
            </p>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
              {availableBorders
                .filter((border) => (border.type ?? "css") === kind)
                .map((border) => {
                  const active = (profile.avatar_border || "default") === border.id;
                  return (
                    <button
                      key={border.id}
                      type="button"
                      title={border.label}
                      onClick={() => update("avatar_border", border.id === "default" ? null : border.id)}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-1.5 transition ${
                        active
                          ? "border-cyan-300/60 bg-cyan-300/10"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-white/25"
                      }`}
                    >
                      <span className="grid h-9 w-9 place-items-center">
                        {border.type === "image" && border.src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={border.src} alt="" className="h-9 w-9 object-contain" loading="lazy" />
                        ) : (
                          <span
                            className="h-6 w-6 rounded-full bg-[var(--surface-0)]"
                            style={{ boxShadow: `0 0 0 3px ${resolveAvatarBorder(border.id).ring}` }}
                          />
                        )}
                      </span>
                      <span
                        className={`w-full truncate text-center text-[9px] font-bold ${
                          active ? "text-cyan-200" : "text-white/45"
                        }`}
                      >
                        {border.label}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}

        <p className="mt-2 text-[10px] text-white/30">Border tampil di komentar, leaderboard, dan profil.</p>
      </div>

      <label className="block">
        <span className="mb-2 block text-xs font-bold text-white/55">Bio · maksimal 280 karakter</span>
        <textarea value={profile.bio || ""} onChange={(event) => update("bio", event.target.value.slice(0, 280))} rows={4} className="rk-input w-full rounded-xl p-3" />
        <span className="mt-1 block text-right text-[10px] text-white/35">{profile.bio?.length || 0}/280</span>
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-bold text-white/55">URL banner HTTPS</span>
        <input type="url" value={profile.banner_url || ""} onChange={(event) => update("banner_url", event.target.value)} placeholder="https://..." className="rk-input w-full rounded-xl px-3 py-3" />
      </label>

      {message && <p className="rounded-xl border border-white/10 p-3 text-sm text-white/70">{message}</p>}
      <button disabled={saving} className="w-full rounded-xl bg-white py-3 text-sm font-black text-black disabled:opacity-50">
        {saving ? "Menyimpan..." : "Simpan profil sosial"}
      </button>
    </form>
  );
}
