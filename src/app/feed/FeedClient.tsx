"use client";

import { useEffect, useState } from "react";
import { socialFetch } from "@/lib/social/client";

type Event = { id: number; actor_name: string; event_type: string; entity_label?: string | null; created_at: string };
const labels: Record<string, string> = { followed_user: "mulai mengikuti", created_collection: "membuat koleksi" };

export default function FeedClient() {
  const [items, setItems] = useState<Event[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  async function load(reset = false) {
    setLoading(true);
    try {
      const result = await socialFetch<{ items: Event[]; nextCursor: string | null }>(`/api/social/feed${!reset && cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
      setItems((current) => reset ? result.items : [...current, ...result.items]); setCursor(result.nextCursor);
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="space-y-3">
    <button onClick={() => load(true)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/70">Refresh</button>
    {items.map((item) => <article key={item.id} className="rk-card-soft rounded-2xl p-4"><p className="text-sm text-white/75"><strong className="text-cyan-200">{item.actor_name}</strong> {labels[item.event_type] || item.event_type} {item.entity_label && <strong>{item.entity_label}</strong>}</p><time className="mt-2 block text-[10px] text-white/35">{new Date(item.created_at).toLocaleString("id-ID")}</time></article>)}
    {!loading && !items.length && <p className="py-12 text-center text-white/40">Ikuti user untuk melihat aktivitas mereka.</p>}
    {cursor && <button disabled={loading} onClick={() => load()} className="w-full rounded-xl border border-white/10 py-3 text-sm font-bold">{loading ? "Memuat..." : "Muat lagi"}</button>}
  </div>;
}
