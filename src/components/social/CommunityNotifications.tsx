"use client";

import { useState } from "react";
import Link from "next/link";
import { FiBell, FiCheck, FiExternalLink, FiLoader, FiX } from "react-icons/fi";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { useSharedNotifications } from "@/hooks/useSharedNotifications";

type Notification = {
  id: string;
  actor_name?: string;
  type?: string;
  target_id?: string;
  slug?: string;
  is_read?: boolean;
  created_at: string;
};

function notificationLabel(item: Notification) {
  if (item.type === "new_follower") return `${item.actor_name || "Seseorang"} mulai mengikuti kamu`;
  if (item.type === "social_reply") return `${item.actor_name || "Seseorang"} membalas postinganmu`;
  if (item.type === "social_like") return `${item.actor_name || "Seseorang"} menyukai postinganmu`;
  return `${item.actor_name || "Seseorang"} mengirim aktivitas baru`;
}

function notificationHref(item: Notification) {
  if (item.type === "new_follower" && item.actor_name) return `/u/${encodeURIComponent(item.actor_name)}`;
  return item.slug || "/files?tab=timeline";
}

export default function CommunityNotifications() {
  const { user } = useSupabaseUser();
  const [open, setOpen] = useState(false);
  const { items, unread, loading, markRead } = useSharedNotifications(user?.id);

  async function toggle() {
    const next = !open;
    setOpen(next);
    return;
  }

  async function markAll() {
    await markRead();
  }

  return (
    <div className="relative">
      <button type="button" onClick={toggle} aria-label="Buka notifikasi" aria-expanded={open} className="relative grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white/60 transition hover:border-white/20 hover:bg-white/5 hover:text-white">
        {open ? <FiX /> : <FiBell />}
        {unread > 0 && <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[var(--accent-2)] px-1 text-[9px] font-black text-black">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <>
          <button type="button" aria-label="Tutup notifikasi" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
          <section className="fixed inset-x-3 top-16 z-50 mx-auto max-h-[min(70vh,34rem)] max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-1)] shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
            <header className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
              <div><h2 className="font-black">Notifikasi</h2><p className="text-[10px] text-white/35">{unread ? `${unread} belum dibaca` : "Semua sudah dibaca"}</p></div>
              <button type="button" disabled={!unread} onClick={markAll} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-bold text-cyan-200 disabled:opacity-30"><FiCheck /> Tandai dibaca</button>
            </header>
            <div className="max-h-[calc(min(70vh,34rem)-4rem)] overflow-y-auto">
              {loading && <div className="grid place-items-center py-12 text-white/40"><FiLoader className="animate-spin" /></div>}
              {!loading && items.map((item) => (
                <Link key={item.id} href={notificationHref(item)} onClick={() => setOpen(false)} className={`flex gap-3 border-b border-white/[0.06] px-4 py-3 transition hover:bg-white/[0.04] ${item.is_read ? "opacity-60" : "bg-cyan-300/[0.035]"}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.is_read ? "bg-white/15" : "bg-[var(--accent-2)]"}`} />
                  <span className="min-w-0 flex-1"><span className="block text-sm leading-relaxed text-white/80">{notificationLabel(item)}</span><time className="mt-1 block text-[10px] text-white/35">{new Date(item.created_at).toLocaleString("id-ID")}</time></span>
                </Link>
              ))}
              {!loading && !items.length && <p className="px-4 py-12 text-center text-sm text-white/40">Belum ada notifikasi.</p>}
            </div>
            <Link href="/notifications" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 border-t border-white/[0.08] px-4 py-3 text-xs font-bold text-cyan-200"><FiExternalLink /> Lihat semua notifikasi</Link>
          </section>
        </>
      )}
    </div>
  );
}
