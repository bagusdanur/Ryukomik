"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FiBookOpen, FiChevronLeft, FiChevronRight, FiMessageCircle } from "react-icons/fi";
import CommentsSupabase from "@/components/CommentsSupabase";
import ProjectUpvoteButton from "@/components/ProjectUpvoteButton";

type ProjectReactionData = {
  upvote_count?: number;
  reaction_counts?: Record<string, number>;
};

type Props = {
  source: string;
  slugStr: string;
  mangaSlug?: string;
  previousSlug?: string;
  nextSlug?: string;
};

function chapterHref(source: string, slug?: string) {
  if (!slug) return "";
  return slug.startsWith("chapter/") ? `/${slug}` : `/chapter/${source}/${slug}`;
}

export default function ReaderEndSection({
  source,
  slugStr,
  mangaSlug,
  previousSlug,
  nextSlug,
}: Props) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [activated, setActivated] = useState(false);
  const [projectReactions, setProjectReactions] = useState<ProjectReactionData>();

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || activated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setActivated(true);
        observer.disconnect();
      },
      { rootMargin: "700px 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [activated]);

  useEffect(() => {
    if (!activated || source !== "project" || !mangaSlug) return;
    let active = true;
    fetch(`/api/project/${encodeURIComponent(mangaSlug)}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (active && payload?.data) setProjectReactions(payload.data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [activated, mangaSlug, source]);

  const comicHref = mangaSlug ? `/komik/${source}/${mangaSlug}` : "/";

  return (
    <section
      ref={sectionRef}
      id="chapter-comments"
      data-no-tap
      className="relative z-[6] border-t border-white/10 bg-[var(--background)] px-3 pb-36 pt-8 text-white select-text sm:px-5 sm:pt-12"
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="rk-card rounded-3xl p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent-2)]">
              <FiBookOpen size={21} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-2)]">Selesai membaca</p>
              <h2 className="mt-0.5 text-lg font-black sm:text-xl">Lanjutkan perjalananmu</h2>
            </div>
          </div>

          <nav aria-label="Navigasi akhir chapter" className="mt-5 grid grid-cols-3 gap-2">
            {previousSlug ? (
              <Link href={chapterHref(source, previousSlug)} className="rk-btn-ghost flex min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-xs font-bold">
                <FiChevronLeft /> <span className="truncate">Sebelumnya</span>
              </Link>
            ) : <span className="rounded-2xl border border-white/5 px-2 py-3 text-center text-xs text-white/25">Awal</span>}
            <Link href={comicHref} className="rk-btn-ghost flex min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-xs font-bold">
              <FiBookOpen /> <span className="truncate">Detail</span>
            </Link>
            {nextSlug ? (
              <Link href={chapterHref(source, nextSlug)} className="rk-btn-primary flex min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-xs font-bold">
                <span className="truncate">Berikutnya</span> <FiChevronRight />
              </Link>
            ) : <span className="rounded-2xl border border-white/5 px-2 py-3 text-center text-xs text-white/25">Terbaru</span>}
          </nav>
        </div>

        {activated ? (
          <>
            {source === "project" && mangaSlug && (
              <div className="rk-card-soft mt-5 rounded-3xl px-3 py-5 sm:px-6 sm:py-7">
                <ProjectUpvoteButton
                  slug={mangaSlug}
                  initialCount={projectReactions?.upvote_count}
                  initialCounts={projectReactions?.reaction_counts}
                />
              </div>
            )}

            <div className="mt-7">
              <div className="mb-4 flex items-center gap-2 px-1">
                <FiMessageCircle className="text-[var(--accent-2)]" />
                <h2 className="text-lg font-black">Komentar Chapter</h2>
              </div>
              <CommentsSupabase type="chapter" slug={`${source}-${slugStr}`} chapter={slugStr} />
            </div>
          </>
        ) : (
          <div className="rk-card-soft mt-5 flex min-h-28 items-center justify-center rounded-3xl text-sm text-white/45">
            Menyiapkan komentar...
          </div>
        )}
      </div>
    </section>
  );
}
