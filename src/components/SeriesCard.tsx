import Link from "next/link";
import type { ReactNode } from "react";
import FallbackImage from "@/components/FallbackImage";

type SeriesCardProps = {
  href: string;
  title?: string;
  image?: string;
  imageCandidates?: string[];
  eyebrow?: string;
  sideEyebrow?: string;
  meta?: string;
  badge?: string;
  corner?: ReactNode;
  priority?: boolean;
  className?: string;
};

export default function SeriesCard({
  href,
  title,
  image,
  imageCandidates,
  eyebrow,
  sideEyebrow,
  meta,
  badge,
  corner,
  priority = false,
  className = "",
}: SeriesCardProps) {
  return (
    <Link prefetch={false} href={href} className={`rk-cover-card group ${className}`}>
      <div className="rk-cover-frame">
        <FallbackImage
          referrerPolicy="no-referrer"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          src={image || ""}
          candidates={imageCandidates}
          alt={title || "Komik"}
          sizes="(max-width: 640px) 32vw, (max-width: 1024px) 20vw, 160px"
        />
        {badge && (
          <span className="rk-cover-badge absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold">
            {badge}
          </span>
        )}
        {corner}
      </div>

      <div className="mt-2 min-w-0">
        <p className="line-clamp-2 text-[13px] font-bold leading-snug text-white/90 group-hover:text-[var(--accent-2)]">
          {title || "Tanpa judul"}
        </p>
        {(eyebrow || sideEyebrow) && (
          <div className="mt-1 flex min-w-0 items-center justify-between gap-2 text-[11px] font-semibold">
            {eyebrow && (
              <span className="min-w-0 truncate text-violet-200/80">
                {eyebrow}
              </span>
            )}
            {sideEyebrow && (
              <span className="shrink-0 truncate text-[var(--accent-2)]">
                {sideEyebrow}
              </span>
            )}
          </div>
        )}
        {meta && (
          <p className="truncate text-[11px] rk-meta-muted">
            {meta}
          </p>
        )}
      </div>
    </Link>
  );
}
