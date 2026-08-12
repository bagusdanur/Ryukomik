"use client";

import { useEffect, useState, type FormEvent } from "react";
import { socialFetch } from "@/lib/social/client";

type Collection = { id: string; name: string; description?: string; visibility: "public" | "private" | "unlisted"; updated_at: string };

export default function SocialCollectionsClient() {
  const [items, setItems] = useState<Collection[]>([]); const [name, setName] = useState(""); const [loading, setLoading] = useState(true);
  async function load() { try { const result = await socialFetch<{ items: Collection[] }>("/api/social/collections"); setItems(result.items); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  async function create(event: FormEvent) { event.preventDefault(); if (!name.trim()) return; await socialFetch("/api/social/collections", { method: "POST", body: JSON.stringify({ name, visibility: "public" }) }); setName(""); await load(); }
  async function visibility(item: Collection, value: Collection["visibility"]) { await socialFetch("/api/social/collections", { method: "PATCH", body: JSON.stringify({ id: item.id, visibility: value }) }); await load(); }
  async function remove(id: string) { if (!confirm("Hapus koleksi ini?")) return; await socialFetch("/api/social/collections", { method: "DELETE", body: JSON.stringify({ id }) }); await load(); }
  return <div className="space-y-4">
    <form onSubmit={create} className="flex gap-2"><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Nama koleksi baru" className="rk-input min-w-0 flex-1 rounded-xl px-4 py-3"/><button className="rounded-xl bg-cyan-300/15 px-4 text-sm font-black text-cyan-100">Buat</button></form>
    {items.map((item) => <article key={item.id} className="rk-card-soft rounded-2xl p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-black">{item.name}</h2><p className="mt-1 text-xs text-white/40">{new Date(item.updated_at).toLocaleDateString("id-ID")}</p></div><button onClick={() => remove(item.id)} className="text-xs text-red-300">Hapus</button></div><select value={item.visibility} onChange={(event) => visibility(item, event.target.value as Collection["visibility"])} className="rk-input mt-3 rounded-lg px-3 py-2 text-xs"><option value="public">Publik</option><option value="unlisted">Tautan saja</option><option value="private">Privat</option></select></article>)}
    {!loading && !items.length && <p className="py-12 text-center text-white/40">Belum ada koleksi.</p>}
  </div>;
}
