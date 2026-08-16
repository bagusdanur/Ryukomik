"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiBell, FiEdit3, FiFolder, FiUsers } from "react-icons/fi";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { useSharedNotifications } from "@/hooks/useSharedNotifications";

const links = [
  { href: "/feed", label: "Feed", icon: FiUsers },
  { href: "/notifications", label: "Notifikasi", icon: FiBell },
  { href: "/social-collections", label: "Koleksi", icon: FiFolder },
  { href: "/social-settings", label: "Profil", icon: FiEdit3 },
];

const socialPrefixes = [
  "/feed",
  "/notifications",
  "/social-collections",
  "/social-settings",
  "/connections",
  "/u/",
];

export default function SocialDock() {
  const pathname = usePathname();
  const { user } = useSupabaseUser();
  const { unread } = useSharedNotifications(user?.id);
  const socialRoute = socialPrefixes.some(
    (route) => pathname === route || pathname.startsWith(route),
  );

  if (!user || !socialRoute) return null;

  return (
    <nav
      className="fixed bottom-[max(.5rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex w-[calc(100vw-1rem)] max-w-sm -translate-x-1/2 items-center justify-around gap-1 overflow-visible rounded-2xl border border-white/10 bg-[color:color-mix(in_srgb,var(--surface-0)_94%,transparent)] p-1.5 shadow-2xl backdrop-blur-xl sm:bottom-5 sm:w-auto sm:max-w-none sm:justify-center"
      aria-label="Menu sosial"
    >
      {links.map((item) => {
        const Icon = item.icon;
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`relative grid h-11 min-w-0 flex-1 place-items-center rounded-xl px-2 transition sm:min-w-12 sm:flex-none sm:px-3 ${
              active
                ? "bg-[var(--accent)] text-white"
                : "text-white/55 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <Icon size={18} />
            {item.href === "/notifications" && unread > 0 && (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent-3)] px-1 text-[8px] font-black text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
            <span className="sr-only">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
