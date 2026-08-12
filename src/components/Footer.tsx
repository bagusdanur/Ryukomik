"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiClock, FiHome, FiSettings, FiUsers } from "react-icons/fi";
import { TbPlayerSkipForward } from "react-icons/tb";

export default function BottomNav() {
  const path = usePathname();

  if (
    path.startsWith("/chapter") ||
    path.startsWith("/novel/chapter") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/game") ||
    path.startsWith("/apk") ||
    path.startsWith("/topup")
  ) {
    return null;
  }

  const menu = [
    { href: "/", icon: FiHome, label: "Home" },
    { href: "/anime/terbaru", icon: TbPlayerSkipForward, label: "Anime" },
    { href: "/terbaru", icon: FiClock, label: "Terbaru" },
    { href: "/files", icon: FiUsers, label: "Komunitas" },
    { href: "/setting", icon: FiSettings, label: "Setting" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-white/[0.08] bg-[var(--background)]">
      <div className="pb-safe mx-auto flex max-w-screen-sm justify-around px-2 pt-2">
        {menu.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-14 flex-col items-center gap-0.5 px-2 py-1.5 text-[11px] font-medium transition ${
                active
                  ? "text-[var(--accent-2)]"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              <Icon size={22} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
