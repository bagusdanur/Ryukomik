"use client";
// Semua kode lama kamu pindah ke sini,
// TAPI hapus useEffect fetch data, ganti dengan props

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useLayoutEffect, useMemo } from "react";
import Link from "next/link";
import type { Chapter, Series } from "@/types/content";
import { useHistoryStore } from "@/store/historyStore";
import CommentsSupabase from "@/components/CommentsSupabase";
import BookmarkButton from "@/components/BookmarkButton";
import Button from "@/components/Button";
import { FaArrowLeft, FaHeart, FaCommentDots } from "react-icons/fa";
import { FiChevronRight, FiHeart } from "react-icons/fi";
import ChapterList from "@/components/ChapterList";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { isActivePremiumProfile, loadCachedProfile } from "@/utils/profileCache";
import { getProxiedThumbnailUrl } from "@/lib/imageProxy";
import ProjectUpvoteButton from "@/components/ProjectUpvoteButton";
import DiscussComicCard from "@/components/social/DiscussComicCard";
import AdultCoverGuard from "@/components/adult/AdultCoverGuard";

type ComicDetail = Series & {
  thumbnail: string;
  title: string;
  author?: string;
  scanlator_handle?: string;
  scanlator_team?: string;
  scanlator_donate?: Array<{ label: string; url: string }> | null;
  scanlator_user?: { username: string; user_id: string } | null;
  scanlator_avatar?: string | null;
  Pengarang?: string;
  Konsep?: string;
  chapters: Chapter[];
  mangaId?: string;
};

import type { ReadHistoryItem } from "@/types/user";

type DetailClientProps = {
  data: ComicDetail | null;
  slug: string;
  source: string;
};

export default function DetailClient({ data, slug, source }: DetailClientProps) {
  const { user } = useSupabaseUser();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [source, slug]);

  const router = useRouter();

  // ✅ Tidak perlu loading state untuk data utama — sudah dari server

  const [expand, setExpand] = useState(false);

  const historyStore = useHistoryStore((state) => state.history);
  const [isPremium, setIsPremium] = useState(false);

  // Premium check
  useEffect(() => {
    if (!user?.id) {
      const id = requestAnimationFrame(() => setIsPremium(false));
      return () => cancelAnimationFrame(id);
    }
    let mounted = true;
    loadCachedProfile(user.id)
      .then((profile) => {
        if (mounted) setIsPremium(isActivePremiumProfile(profile));
      });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // History dari store
  const extractChapter = useCallback((text?: string, slug?: string) => {
    let raw = "";

    // 1. Ambil dari text dulu jika mengandung kata "Chapter" atau "Ch"
    if (text) {
      const match = text.match(/(?:chapter|ch)\s*(\d+(\.\d+)?)/i);
      if (match) {
        raw = match[1];
      } else {
        // Jika text hanya mengandung angka di akhir (biasanya "Judul 01")
        const endMatch = text.match(/(\d+(\.\d+)?)$/);
        if (endMatch) {
          raw = endMatch[1];
        }
      }
    }

    // 2. Fallback dari slug
    if (!raw && slug) {
      // Cari pola "chapter-X" atau "ch-X"
      const match = slug.match(/(?:chapter|ch)[-/](\d+(\.\d+)?)/i);
      if (match) {
        raw = match[1];
      } else {
        // Fallback: ambil angka terakhir di slug jika ada
        const lastNumMatch = slug.match(/(\d+)(?!.*\d)/);
        if (lastNumMatch) {
          raw = lastNumMatch[1];
        }
      }
    }

    // 🔥 POTONG ANGKA SETELAH TITIK
    if (raw.includes(".")) {
      raw = raw.split(".")[0];
    }

    // Hapus leading zero (misal "01" -> "1")
    if (raw) {
      const num = parseInt(raw, 10);
      if (!isNaN(num)) {
        return `Ch. ${num}`;
      }
    }

    return raw ? `Ch. ${raw}` : "Ch. 1";
  }, []);

  const lastRead = useMemo<(ReadHistoryItem & { displayChapter?: string }) | null>(() => {
    try {
      const historyItem = historyStore.find((h: ReadHistoryItem) => h.comicSlug === (data?.mangaId || slug));
      
      if (historyItem) {
        const displayCh = extractChapter(historyItem.lastChapter, historyItem.lastChapterSlug);
        let resolvedSlug = historyItem.lastChapterSlug;
        let resolvedSource = historyItem.source;

        // CROSS-SOURCE SMART MAPPING
        if (resolvedSource && resolvedSource !== source && data?.chapters) {
          const matchingChapter = data.chapters.find(
            (c) => extractChapter(c.title, c.slug) === displayCh
          );

          if (matchingChapter && matchingChapter.slug) {
            resolvedSlug = matchingChapter.slug;
            resolvedSource = source; 
          }
        }

        return {
          ...historyItem,
          displayChapter: displayCh,
          lastChapterSlug: resolvedSlug,
          source: resolvedSource,
        };
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }, [slug, extractChapter, source, data?.chapters, data?.mangaId, historyStore]);

  const chapters = data?.chapters ?? [];
  const proxiedThumbnail = getProxiedThumbnailUrl(data?.thumbnail, source);
  const normalizedStatus = data?.status?.toLowerCase();
  const statusLabel =
    normalizedStatus === "cancelled" ? "Dibatalkan" : data?.status || "Ongoing";

  // ✅ Kalau data null (fetch gagal di server)
  if (!data)
    return (
      <div className="rk-page flex items-center justify-center px-4 text-white">
        <p className="rk-state rounded-2xl px-4 py-8 text-center text-sm">
          Gagal memuat detail.{" "}
          <button onClick={() => router.refresh()} className="font-bold text-[var(--accent-2)]">
            Coba lagi
          </button>
        </p>
      </div>
    );


 

  return (
    <div className="rk-page rk-app-surface w-full pb-28 text-white">
      <div className="relative h-[300px] overflow-hidden sm:h-[360px]">
        <img
          referrerPolicy="no-referrer"
          src={proxiedThumbnail}
          alt={data.title}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          sizes="100vw"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[var(--background)]/76" />

        <div className="absolute top-4 left-4 right-4 flex justify-between z-20">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="rounded-full p-3 active:scale-90"
          >
            <FaArrowLeft />
          </Button>
          <div className="flex gap-3">
            <Button variant="ghost" className="rounded-full p-3 active:scale-90">
              <FaHeart />
            </Button>
            <Button variant="ghost" className="rounded-full p-3 active:scale-90">
              <FaCommentDots />
            </Button>
          </div>
        </div>
      </div>

      <div className="rk-shell px-4 -mt-14 relative z-10">
        <div className="flex gap-4 items-start">
          <div className="h-40 w-28 flex-shrink-0 overflow-hidden rounded-xl border border-white/[0.1]">
            <AdultCoverGuard adult={data.is_adult === true}>
              <img
                referrerPolicy="no-referrer"
                src={proxiedThumbnail}
                alt="Poster"
                loading="eager"
                decoding="async"
                sizes="112px"
                className="h-full w-full object-cover"
              />
            </AdultCoverGuard>
          </div>
          <div className="flex-1 flex min-w-0 flex-col pt-2">
            <h1 className="text-xl font-black leading-tight line-clamp-2">
              {data.title}
            </h1>
            <div className="flex gap-2 items-center text-xs mt-2">
              <span className="rk-chip rounded-full px-2 py-0.5 font-bold">
                {data.type || "Manhua"}
              </span>
              <span className="text-white/60 truncate">
                {data.Pengarang || data.author || (source === "project" ? "Karya Scanlator" : "—")}
              </span>
            </div>
            <div className="flex gap-3 mt-1.5 text-xs font-medium">
              <span className="text-white/80">{data.Konsep || "Aksi"}</span>
              <span
                className={
                  normalizedStatus === "ongoing"
                    ? "text-emerald-300"
                    : normalizedStatus === "cancelled"
                      ? "font-bold text-red-300"
                    : "text-violet-200"
                }
              >
                {statusLabel}
              </span>
            </div>
            {/* TOMBOL SAVED/BOOKMARK */}
            <div className="mt-4">
              <BookmarkButton
                slug={slug}
                source={source}
                title={data.title}
                image={data.thumbnail}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rk-shell px-4 mt-6">
        <p
          className={`text-sm leading-relaxed text-white/70 transition-all ${!expand && "line-clamp-3"}`}
        >
          {data.synopsis}
        </p>
        {(data.synopsis?.length || 0) > 180 && (
          <button
            onClick={() => setExpand(!expand)}
            className="mt-1.5 text-[12px] font-semibold text-[var(--accent-2)] transition-colors hover:text-white"
          >
            {expand ? "Tutup" : "Lihat selengkapnya"}
          </button>
        )}
      </div>

      {data.scanlator_handle && (
        <section className="rk-shell px-4 mt-5">
          <div
            className="overflow-hidden rounded-xl border border-white/[.08]"
            style={{ background: "color-mix(in srgb, var(--accent) 6%, rgba(255,255,255,.02))" }}
          >
            <Link
              href={`/scanlator/${data.scanlator_handle}`}
              className="flex items-center gap-3 p-3.5 transition-colors active:bg-white/[.03]"
            >
              <span className="relative shrink-0">
                {data.scanlator_avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.scanlator_avatar}
                    alt={data.scanlator_team || "Scanlator"}
                    loading="lazy"
                    className="h-12 w-12 rounded-lg border border-white/10 object-cover"
                  />
                ) : (
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 text-base font-black text-white/70"
                    style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)" }}
                  >
                    {(data.scanlator_team || data.scanlator_user?.username || "S").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[9px] font-black text-white ring-2 ring-[#0b0b0f]">
                  TL
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[9px] font-bold uppercase tracking-[.08em] text-[var(--accent-2)]">
                  Scanlator
                </span>
                <span className="mt-0.5 block truncate text-[14px] font-bold leading-tight text-white">
                  {data.scanlator_team || data.scanlator_user?.username || "Scanlator"}
                </span>
                {data.scanlator_user && (
                  <span className="mt-0.5 block truncate text-[11px] leading-tight text-white/40">
                    oleh {data.scanlator_user.username}
                  </span>
                )}
              </span>

              <FiChevronRight size={16} className="shrink-0 text-white/25" />
            </Link>

            <div className="flex items-center gap-2 border-t border-white/[.06] px-3.5 py-2">
              {data.scanlator_donate && data.scanlator_donate.length > 0 ? (
                <>
                  <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">
                    <FiHeart size={10} /> Dukung
                  </span>
                  <div className="-mx-0.5 flex flex-1 gap-1.5 overflow-x-auto px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {data.scanlator_donate.map((d) => (
                      <a
                        key={d.label}
                        href={d.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex min-h-[30px] shrink-0 items-center gap-1 rounded-md border px-2.5 text-[11px] font-semibold text-white/85 transition-colors active:opacity-80"
                        style={{
                          borderColor: "color-mix(in srgb, var(--accent) 28%, transparent)",
                          background: "color-mix(in srgb, var(--accent) 14%, transparent)",
                        }}
                      >
                        <FiHeart size={9} className="text-[var(--accent-2)]" />
                        {d.label}
                      </a>
                    ))}
                  </div>
                </>
              ) : (
                <span className="flex-1 truncate text-[10px] text-white/25">
                  Belum ada link dukungan untuk user ini
                </span>
              )}
              <Link
                href={`/scanlator/lapor?slug=${encodeURIComponent(slug)}&handle=${encodeURIComponent(data.scanlator_handle)}`}
                className="shrink-0 border-l border-white/[.07] pl-2 text-[10px] font-medium text-white/35 transition-colors hover:text-white/70"
              >
                Laporkan
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="rk-shell px-4 mt-4 flex gap-2 flex-wrap">
        {data.genres?.map((g, i) => (
          <Link
            prefetch={false}
            key={i}
            href={`/genre/${g.toLowerCase().replace(/\s+/g, "-")}`}
            className="rk-btn-ghost rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap"
          >
            {g}
          </Link>
        ))}
      </div>

      <ChapterList
        data={data}
        mangaSlug={slug}
        lastRead={lastRead}
        source={source}
        isPremium={isPremium}
        user={user}
      />

      {source === "project" && (
        <section className="rk-shell mt-6 px-3 sm:mt-8 sm:px-4">
          <div className="rk-card-soft rounded-2xl px-3 py-4 text-center sm:rounded-3xl sm:px-5 sm:py-7">
            <ProjectUpvoteButton slug={slug} initialCount={data.upvote_count} initialCounts={data.reaction_counts} />
          </div>
        </section>
      )}

      <DiscussComicCard
        title={data.title}
        source={source}
        slug={slug}
        thumbnail={data.thumbnail}
      />

      <div className="rk-shell px-4 mt-10 border-t border-white/10 pt-10">
        <CommentsSupabase type="komik" slug={`${source}-${slug}`} chapter={undefined} />
      </div>
    </div>
  );
}
