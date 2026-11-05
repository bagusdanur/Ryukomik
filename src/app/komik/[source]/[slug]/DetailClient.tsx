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
import ChapterList from "@/components/ChapterList";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { isActivePremiumProfile, loadCachedProfile } from "@/utils/profileCache";
import { getProxiedThumbnailUrl } from "@/lib/imageProxy";
import ProjectUpvoteButton from "@/components/ProjectUpvoteButton";
import DiscussComicCard from "@/components/social/DiscussComicCard";

type ComicDetail = Series & {
  thumbnail: string;
  title: string;
  author?: string;
  scanlator_handle?: string;
  scanlator_team?: string;
  scanlator_donate?: Array<{ label: string; url: string }> | null;
  scanlator_user?: { username: string; user_id: string } | null;
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
          <div className="flex-shrink-0">
            <img
              referrerPolicy="no-referrer"
              src={proxiedThumbnail}
              alt="Poster"
              loading="eager"
              decoding="async"
              sizes="112px"
              className="h-40 w-28 rounded-2xl border border-white/[0.1] object-cover"
            />
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
                {data.Pengarang || data.author || "Nekoyashiki"}
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
            {/* Atribusi: nama user (profil publik) + nama grup (profil grup) */}
            {data.scanlator_handle && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] leading-none">
                <span className="text-white/35">Diunggah oleh</span>
                {data.scanlator_user ? (
                  <Link href={`/u/${encodeURIComponent(data.scanlator_user.username)}`} className="rounded-md bg-white/[.06] px-2 py-1 font-bold text-white/85 transition hover:bg-white/[.12]">
                    {data.scanlator_user.username}
                  </Link>
                ) : (
                  <span className="rounded-md bg-white/[.06] px-2 py-1 font-bold text-white/60">Scanlator</span>
                )}
                <span className="text-white/20">·</span>
                <Link href={`/scanlator/${data.scanlator_handle}`} className="flex items-center gap-1 rounded-md bg-[var(--accent)]/15 px-2 py-1 font-bold text-[var(--accent-2)] transition hover:bg-[var(--accent)]/25">
                  {data.scanlator_team || data.scanlator_handle}
                </Link>
                <Link
                  href={`/scanlator/lapor?slug=${encodeURIComponent(slug)}&handle=${encodeURIComponent(data.scanlator_handle)}`}
                  className="ml-auto text-[10px] text-white/25 underline-offset-2 transition hover:text-white/50 hover:underline"
                >
                  Laporkan
                </Link>
              </div>
            )}
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
        <button
          onClick={() => setExpand(!expand)}
          className="mt-2 text-sm font-bold text-cyan-200"
        >
          {expand ? "Tutup" : "Lihat selengkapnya"}
        </button>
        {/* Blok Dukung kami (Fase C — link donate eksternal Scanlator) */}
        {data.scanlator_donate && data.scanlator_donate.length > 0 && (
          <div className="rk-card-soft mt-4 rounded-2xl p-4">
            <p className="text-sm font-black text-white">Dukung {data.scanlator_team || "tim translate"}!</p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">Donasi langsung ke akun donate tim ini (keluar dari Ryukomik).</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {data.scanlator_donate.map((d) => (
                <a key={d.label} href={d.url} target="_blank" rel="noreferrer noopener" className="rounded-xl bg-white/[.05] px-3 py-2.5 text-center text-xs font-bold text-white/80 transition hover:bg-white/[.09]">
                  {d.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

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
