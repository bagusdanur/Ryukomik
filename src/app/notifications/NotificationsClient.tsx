"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { socialFetch } from "@/lib/social/client";

type Notification = { id: string; actor_name?: string; type?: string; target_id?: string; slug?: string; is_read?: boolean; created_at: string };

export default function NotificationsClient() {
  const [items, setItems] = useState<Notification[]>([]); const [unread, setUnread] = useState(0); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { const result = await socialFetch<{ items: Notification[]; unreadCount: number }>("/api/social/notifications"); setItems(result.items); setUnread(result.unreadCount); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60_000);
    const visible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", visible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [load]);
  async function markAll() { await socialFetch("/api/social/notifications", { method: "PATCH", body: JSON.stringify({ all: true }) }); setItems((current) => current.map((item) => ({ ...item, is_read: true }))); setUnread(0); }
  const label = (item: Notification) => item.type === "new_follower" ? `${item.actor_name || "Seseorang"} mulai mengikuti kamu` : `${item.actor_name || "Seseorang"} mengirim aktivitas baru`;
  return <div className="space-y-3">
    <div className="flex justify-end"><button disabled={!unread} onClick={markAll} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold disabled:opacity-40">Tandai semua dibaca ({unread})</button></div>
    {items.map((item) => <Link key={item.id} href={item.type === "new_follower" && item.target_id ? `/u/${item.actor_name || item.target_id}` : item.slug || "/feed"} className={`rk-card-soft block rounded-2xl p-4 ${item.is_read ? "opacity-60" : "border-cyan-300/20"}`}><p className="text-sm text-white/80">{label(item)}</p><time className="mt-2 block text-[10px] text-white/35">{new Date(item.created_at).toLocaleString("id-ID")}</time></Link>)}
    {!loading && !items.length && <p className="py-12 text-center text-white/40">Belum ada notifikasi.</p>}
  </div>;
}
