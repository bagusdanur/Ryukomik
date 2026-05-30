import { memo } from "react";
import { LiaReadme } from "react-icons/lia";
import SeriesCard from "@/components/SeriesCard";
import type { SourceId, UpdateItem } from "@/types/content";
import type { ReadHistoryItem } from "@/types/user";

const normalizeSlug = (slug = "", source = "") => {
  const prefix = `${source}-`;
  return slug.startsWith(prefix) ? slug.slice(prefix.length) : slug;
};

function typeFlag(type?: string): { src: string; label: string } | null {
  const t = (type || "").toLowerCase();
  if (t.includes("manhwa")) return { src: "/flags/kr.svg", label: "Korea" };
  if (t.includes("manhua")) return { src: "/flags/cn.svg", label: "China" };
  if (t.includes("manga")) return { src: "/flags/jp.svg", label: "Jepang" };
  return null;
}

interface ComicCardProps {
  item: UpdateItem;
  lastRead: (ReadHistoryItem & { lastChapter?: string }) | null;
  source: SourceId;
}

function ComicCard({ item, lastRead, source }: ComicCardProps) {
  const itemSource = item.source || source;
  const slug = normalizeSlug(item.slug, itemSource);
  const href =
    source === "meionovels"
      ? `/novel/${slug}`
      : `/komik/${itemSource}/${slug}`;
  const flag = typeFlag(item.type_genre?.split(" ")[0]);

  return (
    <SeriesCard
      href={href}
      title={item.title}
      image={item.image}
      eyebrow={(item.chapter_terbaru || "").replace("Chapter", "Ch.")}
      sideEyebrow={lastRead ? (lastRead.lastChapter || "").replace("Chapter", "Ch.") : undefined}
      meta={item.info || ""}
      corner={
        <>
          {flag && (
            <span className="absolute left-2 top-2 flex h-4 w-6 items-center justify-center overflow-hidden rounded-sm bg-transparent">
            <img
              src={flag.src}
              alt={flag.label}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            </span>
          )}

          {lastRead && (
            <span
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--accent-2)]/35 bg-[var(--surface-1)]/90 text-[var(--accent-2)]"
              title={`Terakhir: ${(lastRead.lastChapter || "").replace("Chapter", "Ch.")}`}
            >
              <LiaReadme size={15} />
            </span>
          )}
        </>
      }
    />
  );
}

export default memo(ComicCard);
