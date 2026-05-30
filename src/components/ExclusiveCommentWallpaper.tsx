"use client";

import { useEffect, useRef, useState } from "react";

const EXCLUSIVE_GIF_WALLPAPER =
  "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGtsdGNpd3ptcGIyZmpxaG4wZGc5eHU1cWk1MTdoN2h6NG1yM296diZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/V69LhUggYIg6qmKUoD/giphy.gif";

type ExclusiveCommentType = "normal" | "admin" | "premium" | string;

export default function ExclusiveCommentWallpaper({
  type,
}: {
  type: ExclusiveCommentType;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (type === "normal" || visible) return;
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
  }, [type, visible]);

  if (type === "normal") return null;

  const overlay =
    type === "admin"
      ? "bg-[rgba(18,4,8,0.82)]"
      : "bg-[rgba(12,8,24,0.82)]";

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl"
    >
      {visible && (
        <img
          src={EXCLUSIVE_GIF_WALLPAPER}
          className="h-full w-full object-cover opacity-35"
          alt=""
          loading="lazy"
          decoding="async"
        />
      )}
      <div className={`absolute inset-0 ${overlay}`} />
    </div>
  );
}
