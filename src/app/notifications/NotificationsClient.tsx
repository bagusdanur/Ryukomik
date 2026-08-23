"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FiCheck, FiRefreshCw, FiSettings } from "react-icons/fi";
import { socialFetch } from "@/lib/social/client";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { useSharedNotifications } from "@/hooks/useSharedNotifications";
import { getNotificationLink } from "@/utils/notificationLink";
import { getNotificationLabel } from "@/utils/notificationPresentation";

type Notification = { id: string; actor_name?: string; type?: string; target_id?: string; slug?: string; is_read?: boolean; created_at: string };
export default function NotificationsClient() {
  const { user } = useSupabaseUser();
  const { items: sharedItems, unread, loading, nextCursor, markRead } = useSharedNotifications(user?.id);
  const [olderItems, setOlderItems] = useState<Notification[]>([]); const [cursor, setCursor] = useState<string | null | undefined>(undefined); const [filter, setFilter] = useState<"all" | "unread">("all");
  const items = useMemo(() => [...sharedItems, ...olderItems.filter((old) => !sharedItems.some((item) => item.id === old.id))], [olderItems, sharedItems]);
  const activeCursor = cursor === undefined ? nextCursor : cursor;
  async function load(more = false) { if (!more || !activeCursor) return; const result = await socialFetch<{ items: Notification[]; nextCursor?: string | null }>(`/api/social/notifications?cursor=${encodeURIComponent(activeCursor)}`); setOlderItems((current) => [...current, ...result.items]); setCursor(result.nextCursor || null); }
  async function markAll() { await markRead(); }
  async function markOne(id: string) { const item = items.find((entry) => entry.id === id); if (!item || item.is_read) return; await markRead([id]); }
  const visibleItems = useMemo(() => filter === "unread" ? items.filter((item) => !item.is_read) : items, [filter, items]);
  return <div className="space-y-3"><div className="flex flex-wrap items-center gap-2"><div className="flex rounded-xl border border-white/10 p-1">{(["all","unread"] as const).map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-xs font-black ${filter === value ? "bg-white/8 text-cyan-200" : "text-white/40"}`}>{value === "all" ? "Semua" : `Belum dibaca (${unread})`}</button>)}</div><Link href="/social-controls" className="ml-auto grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/50" aria-label="Pengaturan notifikasi"><FiSettings/></Link><button disabled={!unread} onClick={markAll} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold disabled:opacity-40"><FiCheck/> Tandai semua</button></div>{visibleItems.map((item) => <Link key={item.id} href={getNotificationLink(item)} onClick={() => void markOne(item.id)} className={`rk-card-soft block rounded-2xl p-4 transition hover:bg-white/[0.04] ${item.is_read ? "opacity-60" : "border-cyan-300/20 bg-cyan-300/[0.025]"}`}><p className="text-sm text-white/80">{getNotificationLabel(item)}</p><time className="mt-2 block text-[10px] text-white/35">{new Date(item.created_at).toLocaleString("id-ID")}</time></Link>)}{loading && !items.length && <p className="py-12 text-center text-white/40"><FiRefreshCw className="mx-auto mb-2 animate-spin"/>Memuat notifikasi...</p>}{!loading && !visibleItems.length && <p className="py-12 text-center text-white/40">Tidak ada notifikasi pada filter ini.</p>}{activeCursor && <button onClick={() => load(true)} disabled={loading} className="w-full rounded-xl border border-white/10 py-3 text-sm font-black text-white/60">{loading ? "Memuat..." : "Muat lainnya"}</button>}</div>;
}
