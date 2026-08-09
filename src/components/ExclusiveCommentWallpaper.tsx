"use client";

import { useEffect, useRef, useState } from "react";

// Semua dari channel resmi terverifikasi Cyberpunk: Edgerunners
// (Studio Trigger x Netflix) di Giphy — beda GIF per tier biar gak
// keliatan ditempel-tempel sama semua.
const WALLPAPER_BY_TYPE = {
  // "Eye Lights" — tegas & menyala, buat admin.
  admin: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExODVtZGc5bnFoMmMycjhvMnd2eTF5eDRtZ2syazM4cGZuaGFjdHVmcyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/lH6DWLFh4mWtk7ou9f/giphy.gif",
  // "All Good Smile" — hangat & positif, buat staff.
  staff: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZG05MXBnaGJ5dmhwbTB2M2puY3JvNnF4dGhkdGczanB5bGZsMHU5dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/XnZacC7iFtMcj5eQsW/giphy.gif",
  // "Glitch Moon" — moody/atmospheric, buat member premium/VIP.
  premium: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGhhMzlyejhqdjh2dnZzM2s0eXUxYmkzcmkwMHFoaWVzNmk2djNlNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QU7IFSUto0kIV0l5H8/giphy.gif",
} as const;

type ExclusiveCommentType = "normal" | "admin" | "staff" | "premium" | string;

const OVERLAY_BY_TYPE: Record<string, string> = {
  admin: "bg-[rgba(18,4,8,0.82)]",
  staff: "bg-[rgba(4,18,12,0.82)]",
  premium: "bg-[rgba(12,8,24,0.82)]",
};

export default function ExclusiveCommentWallpaper({
  type,
}: {
  type: ExclusiveCommentType;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const wallpaperUrl = WALLPAPER_BY_TYPE[type as keyof typeof WALLPAPER_BY_TYPE];

  useEffect(() => {
    if (!wallpaperUrl || visible) return;
    const node = ref.current;
    if (!node) return;

    if (!("IntersectionObserver" in window)) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "180px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [wallpaperUrl, visible]);

  if (!wallpaperUrl) return null;

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl"
    >
      {visible && (
        <img
          src={wallpaperUrl}
          className="h-full w-full object-cover opacity-35"
          alt=""
          loading="lazy"
          decoding="async"
        />
      )}
      <div className={`absolute inset-0 ${OVERLAY_BY_TYPE[type] || OVERLAY_BY_TYPE.premium}`} />
    </div>
  );
}
