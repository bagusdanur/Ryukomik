"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FiBell, FiEdit3, FiFolder, FiUsers } from "react-icons/fi";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { socialFetch } from "@/lib/social/client";

const links = [
  { href: "/feed", label: "Feed", icon: FiUsers },
  { href: "/notifications", label: "Notifikasi", icon: FiBell },
  { href: "/social-collections", label: "Koleksi", icon: FiFolder },
  { href: "/social-settings", label: "Profil", icon: FiEdit3 },
];

export default function SocialDock() {
  const pathname = usePathname(); const { user } = useSupabaseUser(); const [unread, setUnread] = useState(0);
  const poll = useCallback(async () => {
    if (!user || document.visibilityState !== "visible") return;
    try { const result = await socialFetch<{ unreadCount: number }>("/api/social/notifications?count=1"); setUnread(result.unreadCount); } catch { setUnread(0); }
  }, [user]);
  useEffect(() => {
    if (!user) return; void poll(); const timer = window.setInterval(poll, 60_000);
    const visible = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", visible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [poll, user]);
  if (!user) return null;
  return <nav className="fixed bottom-3 left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-2xl border border-white/10 bg-[color:color-mix(in_srgb,var(--surface-0)_90%,transparent)] p-1.5 shadow-2xl backdrop-blur-xl sm:bottom-5" aria-label="Menu sosial">
    {links.map((item) => { const Icon = item.icon; const active = pathname.startsWith(item.href); return <Link key={item.href} href={item.href} title={item.label} className={`relative grid h-11 min-w-12 place-items-center rounded-xl px-3 transition ${active ? "bg-[var(--accent)] text-white" : "text-white/55 hover:bg-white/[0.06] hover:text-white"}`}><Icon size={18}/>{item.href === "/notifications" && unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent-3)] px-1 text-[8px] font-black text-white">{unread > 99 ? "99+" : unread}</span>}<span className="sr-only">{item.label}</span></Link>; })}
  </nav>;
}
