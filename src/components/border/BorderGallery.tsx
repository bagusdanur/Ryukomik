"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import { supabase } from "@/lib/supabaseClient";
import {
  AVATAR_BORDERS,
  borderGroup,
  isAdminOnlyBorder,
  type AvatarBorderGroup,
} from "@/lib/avatarBorders";

const TABS: Array<{ key: AvatarBorderGroup; label: string; hint: string }> = [
  { key: "dasar", label: "Warna", hint: "Ring warna sederhana, gratis untuk semua member." },
  { key: "klasik", label: "Klasik", hint: "Frame orisinal Ryukomik." },
  { key: "shop", label: "Shop", hint: "Frame khusus — belum dibuka untuk umum." },
  { key: "event", label: "Event", hint: "Hadiah event, contohnya Juara 1 Marathon mingguan." },
];

export default function BorderGallery() {
  const [tab, setTab] = useState<AvatarBorderGroup>("dasar");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isChampion, setIsChampion] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/social/me/profile", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setIsAdmin(Boolean(data.is_admin));
        setIsPremium(Boolean(data.profile?.is_premium));
        setIsChampion(Boolean(data.marathon_champion));
        setCurrent(data.profile?.avatar_border ?? null);
      })
      .catch(() => undefined);
  }, []);

  const visible = Object.values(AVATAR_BORDERS).filter(
    (border) => !border.hidden && (isAdmin || !isAdminOnlyBorder(border.id)),
  );
  const items = visible.filter((border) => borderGroup(border) === tab);

  async function apply(id: string | null) {
    setSaving(id ?? "default");
    setMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setMessage("Login dulu untuk memakai border.");
        return;
      }
      const res = await fetch("/api/social/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar_border: id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setCurrent(id);
      setMessage("Border tersimpan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan border.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="pb-24">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const count = visible.filter((border) => borderGroup(border) === t.key).length;
          if (count === 0) return null;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition ${
                active
                  ? "border-cyan-300/60 bg-cyan-300/10 text-cyan-100"
                  : "border-white/[0.08] bg-white/[0.02] text-white/45 hover:text-white/70"
              }`}
            >
              {t.label} <span className="ml-1 text-white/30">{count}</span>
            </button>
          );
        })}
      </div>

      <p className="mb-4 text-[11px] text-white/40">{TABS.find((t) => t.key === tab)?.hint}</p>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[.03] p-4 text-xs text-white/40">
          Belum ada border di kelas ini.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((border) => {
            const active = (current || "default") === border.id;
            return (
              <div
                key={border.id}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition ${
                  active ? "border-cyan-300/50 bg-cyan-300/[.06]" : "border-white/[0.08] bg-white/[.02]"
                }`}
              >
                <UserAvatar
                  name="R"
                  size={64}
                  shape="circle"
                  border={border.id === "default" ? null : border.id}
                />
                <p className="flex items-center gap-1 text-[11px] font-bold text-white/80">
                  {border.label}
                  {border.premiumOnly ? (
                    <span className="rounded bg-amber-400/20 px-1 py-0.5 text-[8px] font-black text-amber-300">PREMIUM</span>
                  ) : null}
                  {border.championOnly ? (
                    <span className="rounded bg-yellow-400/20 px-1 py-0.5 text-[8px] font-black text-yellow-300">JUARA 1</span>
                  ) : null}
                </p>
                <button
                  type="button"
                  onClick={() => apply(border.id === "default" ? null : border.id)}
                  disabled={
                    active ||
                    saving === border.id ||
                    Boolean(border.premiumOnly && !isPremium && !isAdmin) ||
                    Boolean(border.championOnly && !isChampion && !isAdmin)
                  }
                  className={`w-full rounded-lg px-2 py-1.5 text-[10px] font-black uppercase transition ${
                    active
                      ? "cursor-default bg-white/[.06] text-white/40"
                      : "bg-cyan-300/15 text-cyan-100 hover:bg-cyan-300/25 disabled:opacity-50"
                  }`}
                >
                  {active
                    ? "Dipakai"
                    : saving === border.id
                      ? "Menyimpan..."
                      : border.premiumOnly && !isPremium && !isAdmin
                        ? "Khusus Premium"
                        : border.championOnly && !isChampion && !isAdmin
                          ? "Khusus Juara 1"
                          : "Pakai"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {message && <p className="mt-4 text-[11px] font-semibold text-cyan-200">{message}</p>}

      <p className="mt-6 text-[11px] text-white/35">
        Border tampil di komentar, leaderboard, marathon, dan profil publik. Ubah kapan saja dari sini atau{" "}
        <Link href="/social-settings" className="font-bold text-cyan-200 hover:text-cyan-100">
          pengaturan profil
        </Link>
        .
      </p>
    </div>
  );
}
