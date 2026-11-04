import Link from "next/link";
import { useMemo } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface ReaderTopBarProps {
  title?: string;
  chapter?: string;
  source?: string;
  previousSlug?: string;
  nextSlug?: string;
}

function chapterNumber(value?: string) {
  const match = value?.match(/(?:chapter[-_])?(\d+(?:\.\d+)?)(?:$|[-_])/i);
  return match?.[1] ?? null;
}

function chapterHref(source?: string, slug?: string) {
  if (!source || !slug) return "";
  return slug.startsWith("chapter/") ? `/${slug}` : `/chapter/${source}/${slug}`;
}

export default function ReaderTopBar({
  title,
  chapter,
  source,
  previousSlug,
  nextSlug,
}: ReaderTopBarProps) {
  const formatted = useMemo(
    () => title?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "",
    [title],
  );
  const currentNumber = chapterNumber(chapter) || chapter || "-";
  const previousNumber = chapterNumber(previousSlug);
  const nextNumber = chapterNumber(nextSlug);
  const previousHref = chapterHref(source, previousSlug);
  const nextHref = chapterHref(source, nextSlug);

  return (
    <div className="rk-reader-chrome fixed left-0 right-0 top-0 z-10 border-b">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="truncate text-center text-xs font-bold text-white/90 sm:text-sm">
          {formatted}
        </div>

        <nav
          aria-label="Nomor chapter"
          className="mx-auto mt-2 flex w-fit items-center gap-1 rounded-full border border-white/10 bg-black/25 p-1"
        >
          {previousHref && previousNumber ? (
            <Link
              href={previousHref}
              aria-label={`Chapter sebelumnya ${previousNumber}`}
              className="flex h-7 min-w-9 items-center justify-center gap-0.5 rounded-full px-2 text-xs font-bold text-white/55 transition hover:bg-white/10 hover:text-white"
            >
              <FiChevronLeft size={13} />
              {previousNumber}
            </Link>
          ) : (
            <span className="flex h-7 min-w-9 items-center justify-center px-2 text-xs text-white/20">-</span>
          )}
          <span className="flex h-7 items-center rounded-full bg-[var(--accent)] px-3 text-xs font-black text-black">
            CH {currentNumber}
          </span>
          {nextHref && nextNumber ? (
            <Link
              href={nextHref}
              aria-label={`Chapter berikutnya ${nextNumber}`}
              className="flex h-7 min-w-9 items-center justify-center gap-0.5 rounded-full px-2 text-xs font-bold text-white/55 transition hover:bg-white/10 hover:text-white"
            >
              {nextNumber}
              <FiChevronRight size={13} />
            </Link>
          ) : (
            <span className="flex h-7 min-w-9 items-center justify-center px-2 text-xs text-white/20">-</span>
          )}
        </nav>
      </div>
    </div>
  );
}
