"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FiBell, FiSlash, FiVolumeX } from "react-icons/fi";
import { socialFetch } from "@/lib/social/client";

type Person = { id: string; username: string; avatar_url?: string | null; bio?: string | null };
type Preferences = { follows: boolean; likes: boolean; replies: boolean; mentions: boolean; collections: boolean };
const labels: Record<keyof Preferences, string> = { follows: "Pengikut baru", likes: "Like posting", replies: "Balasan", mentions: "Mention", collections: "Aktivitas koleksi" };

export default function SocialControlsClient() {
  const [kind, setKind] = useState<"block" | "mute">("block");
  const [items, setItems] = useState<Person[]>([]);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const [relations, prefs] = await Promise.all([
      socialFetch<{ items: Person[] }>(`/api/social/relationships?kind=${kind}`),
      socialFetch<{ preferences: Preferences }>("/api/social/preferences"),
    ]);
    setItems(relations.items); setPreferences(prefs.preferences);
  }, [kind]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function remove(person: Person) {
    await socialFetch("/api/social/relationships", { method: "DELETE", body: JSON.stringify({ kind, targetUserId: person.id }) });
    setItems((current) => current.filter((item) => item.id !== person.id)); setMessage(`@${person.username} sudah dipulihkan.`);
  }
  async function toggle(key: keyof Preferences) {
    if (!preferences) return;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    try { await socialFetch("/api/social/preferences", { method: "PATCH", body: JSON.stringify(next) }); }
    catch { setPreferences(preferences); }
  }
  return <div className="mt-6 space-y-6">
    {message && <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/5 px-4 py-3 text-xs text-cyan-100">{message}</div>}
    <section className="rk-card-soft overflow-hidden rounded-2xl"><div className="flex items-center gap-2 border-b border-white/10 p-4"><FiBell className="text-cyan-300"/><h2 className="font-black">Preferensi notifikasi</h2></div><div className="divide-y divide-white/[0.06]">{preferences && (Object.keys(labels) as Array<keyof Preferences>).map((key) => <button key={key} onClick={() => toggle(key)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm"><span>{labels[key]}</span><span className={`h-6 w-11 rounded-full p-1 transition ${preferences[key] ? "bg-cyan-400/35" : "bg-white/10"}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${preferences[key] ? "translate-x-5" : ""}`}/></span></button>)}</div></section>
    <section className="rk-card-soft overflow-hidden rounded-2xl"><div className="grid grid-cols-2 border-b border-white/10">{(["block", "mute"] as const).map((tab) => <button key={tab} onClick={() => setKind(tab)} className={`flex items-center justify-center gap-2 py-3 text-sm font-black ${kind === tab ? "bg-white/5 text-cyan-200" : "text-white/40"}`}>{tab === "block" ? <FiSlash/> : <FiVolumeX/>}{tab === "block" ? "Diblokir" : "Dibisukan"}</button>)}</div><div className="divide-y divide-white/[0.06]">{items.map((person) => <div key={person.id} className="flex items-center gap-3 p-4"><Link href={`/u/${encodeURIComponent(person.username)}`} className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white/5 font-black">{person.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full object-cover"/> : person.username[0]?.toUpperCase()}</Link><div className="min-w-0 flex-1"><Link href={`/u/${encodeURIComponent(person.username)}`} className="font-black hover:text-cyan-200">@{person.username}</Link><p className="truncate text-xs text-white/40">{person.bio || "Pengguna Ryukomik"}</p></div><button onClick={() => remove(person)} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white/65">Pulihkan</button></div>)}{!items.length && <p className="p-8 text-center text-sm text-white/35">Daftar masih kosong.</p>}</div></section>
  </div>;
}
