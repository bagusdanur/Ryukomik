"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { socialFetch } from "@/lib/social/client";

type Person = { id: string; username: string; avatar_url?: string | null; bio?: string | null; level?: number; created_at: string };

export default function ConnectionsClient() {
  const [mode, setMode] = useState<"followers" | "following">("followers"); const [items, setItems] = useState<Person[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  async function load(reset = false, selected = mode) {
    setLoading(true);
    try { const result = await socialFetch<{ items: Person[]; nextCursor: string | null }>(`/api/social/connections?mode=${selected}${!reset && cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`); setItems((current) => reset ? result.items : [...current, ...result.items]); setCursor(result.nextCursor); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(true, mode); }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps
  async function relation(person: Person, kind: "block" | "mute") { if (!confirm(`${kind === "block" ? "Blokir" : "Bisukan"} @${person.username}?`)) return; await socialFetch("/api/social/relationship", { method: "POST", body: JSON.stringify({ targetUserId: person.id, kind }) }); if (kind === "block") setItems((current) => current.filter((item) => item.id !== person.id)); }
  return <div>
    <div className="mb-4 grid grid-cols-2 rounded-xl border border-white/10 p-1">{(["followers", "following"] as const).map((tab) => <button key={tab} onClick={() => setMode(tab)} className={`rounded-lg py-2 text-sm font-black ${mode === tab ? "bg-[var(--accent)] text-white" : "text-white/45"}`}>{tab === "followers" ? "Pengikut" : "Mengikuti"}</button>)}</div>
    <div className="space-y-2">{items.map((person) => <article key={person.id} className="rk-card-soft flex gap-3 rounded-2xl p-3"><Link href={`/u/${encodeURIComponent(person.username)}`} className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-white/5 font-black">{person.avatar_url ? <img src={person.avatar_url} alt="" className="h-full w-full object-cover"/> : person.username[0]?.toUpperCase()}</Link><div className="min-w-0 flex-1"><Link href={`/u/${encodeURIComponent(person.username)}`} className="font-black hover:text-cyan-200">{person.username}</Link><p className="line-clamp-2 text-xs text-white/45">{person.bio || `Pembaca level ${person.level || 1}`}</p><div className="mt-2 flex gap-3"><button onClick={() => relation(person, "mute")} className="text-[10px] font-bold text-white/40">Bisukan</button><button onClick={() => relation(person, "block")} className="text-[10px] font-bold text-red-300/70">Blokir</button></div></div></article>)}</div>
    {!loading && !items.length && <p className="py-12 text-center text-white/40">Belum ada koneksi sosial.</p>}
    {cursor && <button disabled={loading} onClick={() => load()} className="mt-4 w-full rounded-xl border border-white/10 py-3 text-sm font-black">{loading ? "Memuat..." : "Muat lagi"}</button>}
  </div>;
}
