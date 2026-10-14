"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiBookOpen, FiGrid, FiHeart, FiMessageCircle, FiUserPlus } from "react-icons/fi";
import { supabase } from "@/lib/supabaseClient";
import { relativeTime } from "@/lib/social/relativeTime";

type Collection = {
  id: string;
  name: string;
  description?: string | null;
  cover_url?: string | null;
  items_count: number;
  updated_at: string;
};

type Activity = {
  id: string;
  event_type: string;
  entity_id?: string | null;
  entity_label?: string | null;
  created_at: string;
};

function activityText(item: Activity) {
  switch (item.event_type) {
    case "created_post":
      return { text: item.entity_label || "Membuat postingan baru", href: item.entity_id ? `/post/${item.entity_id}` : null, icon: <FiMessageCircle /> };
    case "replied_post":
      return { text: `Membalas: ${item.entity_label || "postingan"}`, href: item.entity_id ? `/post/${item.entity_id}` : null, icon: <FiMessageCircle /> };
    case "followed_user":
      return { text: `Mengikuti @${item.entity_label || "user"}`, href: item.entity_label ? `/u/${encodeURIComponent(item.entity_label)}` : null, icon: <FiUserPlus /> };
    case "created_collection":
      return { text: `Membuat koleksi "${item.entity_label || "Koleksi"}"`, href: item.entity_id ? `/collection/${item.entity_id}` : null, icon: <FiGrid /> };
    default:
      return { text: item.entity_label || item.event_type, href: null, icon: <FiHeart /> };
  }
}

export default function PublicProfileSections({ username, section, viewerId }: { username: string; section: "collections" | "activity"; viewerId?: string | null }) {
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [activities, setActivities] = useState<Activity[] | null>(null);

  useEffect(() => {
    let active = true;
    if (section === "collections") {
      setActivities(null);
      fetch(`/api/social/profile/${encodeURIComponent(username)}/collections`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((r) => { if (active) setCollections((r as { items: Collection[] }).items || []); })
        .catch(() => { if (active) setCollections([]); });
    } else {
      setCollections(null);
      supabase.auth.getSession()
        .then(({ data }) => {
          const token = data.session?.access_token;
          return fetch(`/api/social/profile/${encodeURIComponent(username)}/activity`, { cache: "no-store", headers: token ? { authorization: token } : undefined });
        })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((r) => { if (active) setActivities((r as { items: Activity[] }).items || []); })
        .catch(() => { if (active) setActivities([]); });
    }
    return () => { active = false; };
  }, [username, section, viewerId]);

  if (section === "collections") {
    return (
      <section id="profile-collections" className="mx-auto max-w-2xl border-x border-b border-white/[0.08] bg-[var(--surface-0)] text-white">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-black"><FiGrid /> Koleksi</h2>
          <span className="text-[11px] text-white/35">{collections?.length ?? 0}</span>
        </div>
        {collections === null && (
          <div className="space-y-2 p-4">{[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />)}</div>
        )}
        {collections?.length === 0 && <p className="px-4 py-8 text-center text-sm text-white/35">Belum ada koleksi publik.</p>}
        {collections?.map((collection) => (
          <Link key={collection.id} href={`/collection/${collection.id}`} className="flex gap-3 border-b border-white/[0.06] p-4 transition last:border-b-0 hover:bg-white/[0.02]">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[var(--surface-2)]">
              {collection.cover_url ? <img src={collection.cover_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-white/25"><FiBookOpen className="text-xl" /></div>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">{collection.name}</p>
              {collection.description && <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-white/45">{collection.description}</p>}
              <p className="mt-1 text-[10px] text-white/30">{collection.items_count} komik · {relativeTime(collection.updated_at)}</p>
            </div>
          </Link>
        ))}
      </section>
    );
  }

  return (
    <section id="profile-activity" className="mx-auto max-w-2xl border-x border-b border-white/[0.08] bg-[var(--surface-0)] text-white">
      <div className="border-b border-white/[0.08] px-4 py-3">
        <h2 className="text-sm font-black">Aktivitas</h2>
      </div>
      {activities === null && (
        <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-white/5" />)}</div>
      )}
      {activities?.length === 0 && <p className="px-4 py-8 text-center text-sm text-white/35">Belum ada aktivitas terbaru.</p>}
      {activities?.map((item) => {
        const info = activityText(item);
        const inner = (
          <>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-[var(--accent-2)]">{info.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white/85">{info.text}</p>
              <p className="text-[10px] text-white/35">{relativeTime(item.created_at)}</p>
            </div>
          </>
        );
        return info.href ? (
          <Link key={item.id} href={info.href} className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 transition last:border-b-0 hover:bg-white/[0.02]">{inner}</Link>
        ) : (
          <div key={item.id} className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 last:border-b-0">{inner}</div>
        );
      })}
    </section>
  );
}
