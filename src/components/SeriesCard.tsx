import Link from "next/link";
import { useMemo } from "react";
import type { MouseEventHandler, ReactNode } from "react";
import FallbackImage from "@/components/FallbackImage";
import { getProxiedThumbnailUrl } from "@/lib/imageProxy";
import AdultCoverGuard from "@/components/adult/AdultCoverGuard";
import { isAdultSource } from "@/utils/adultConsent";

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
  source?: string;
  isAdult?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
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
  source,
  isAdult = false,
  onClick,
}: SeriesCardProps) {
  const detectedSource = useMemo(() => {
    if (source) return source;
    if (href.startsWith("/komik/")) {
      const parts = href.split("/");
      return parts[2];
    }
    return undefined;
  }, [href, source]);

  const adult = isAdult || isAdultSource(detectedSource) || badge === "18+";

  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    onClick?.(event);
  };

  const candidates = useMemo(() => {
    if (imageCandidates) return imageCandidates;
    if (image) {
      const proxied = getProxiedThumbnailUrl(image, detectedSource);
      if (proxied !== image) {
        // Kiryuu: direct dulu (hemat egress), proxy backend cadangan.
        // Sumber proxy-first (adult/doujindesu) tetap proxy lebih dulu.
        return detectedSource === "kiryuu" ? [image, proxied] : [proxied, image];
      }
    }
    return [];
  }, [imageCandidates, image, detectedSource]);

  return (
    <Link
      prefetch={false}
      href={href}
      onClick={handleClick}
      className={`rk-cover-card group ${className}`}
    >
      <div className="rk-cover-frame">
        <AdultCoverGuard adult={adult} revealKey={isAdultSource(detectedSource) ? detectedSource : undefined}>
          <FallbackImage
            referrerPolicy="no-referrer"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            src={image || ""}
            candidates={candidates}
            alt={title || "Komik"}
            sizes="(max-width: 640px) 32vw, (max-width: 1024px) 20vw, 160px"
          />
        </AdultCoverGuard>
        {badge && (
          <span className="rk-cover-badge absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold">
            {badge}
          </span>
        )}
        {corner}
      </div>

      <div className="mt-2 min-w-0">
        <p className="line-clamp-2 text-[13px] font-bold leading-snug text-white/90 transition-colors duration-200 group-hover:text-[var(--accent-2)]">
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
