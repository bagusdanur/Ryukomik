"use client";
// Semua kode lama kamu pindah ke sini,
// TAPI hapus useEffect fetch data, ganti dengan props

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useLayoutEffect } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { Chapter, Series } from "@/types/content";
import CommentsSupabase from "@/components/CommentsSupabase";
import BookmarkButton from "@/components/BookmarkButton";
import { FaArrowLeft, FaHeart, FaCommentDots } from "react-icons/fa";
import ChapterList from "@/components/ChapterList";
import { supabase } from "@/lib/supabaseClient";

type ComicDetail = Series & {
  thumbnail: string;
  title: string;
  author?: string;
  Pengarang?: string;
  Konsep?: string;
  chapters: Chapter[];
};

type ReadHistoryItem = {
  comicSlug?: string;
  lastChapter?: string;
  lastChapterSlug?: string;
  displayChapter?: string;
  [key: string]: unknown;
};

type DetailClientProps = {
  data: ComicDetail | null;
  slug: string;
  source: string;
};

function readHistory(): ReadHistoryItem[] {
  try {
    const history = JSON.parse(localStorage.getItem("read_history") ?? "[]");
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

export default function DetailClient({ data, slug, source }: DetailClientProps) {
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [source, slug]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const router = useRouter();

  // ✅ Tidak perlu loading state untuk data utama — sudah dari server

  const [expand, setExpand] = useState(false);

  const [lastRead, setLastRead] = useState<ReadHistoryItem | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Auth — tetap di client karena user-specific
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user || null),
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  // Premium check
  useEffect(() => {
    if (!user) {
      const id = requestAnimationFrame(() => setIsPremium(false));
      return () => cancelAnimationFrame(id);
    }
    let mounted = true;
    supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (mounted) setIsPremium(data?.is_premium || false);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  // History dari localStorage
  const extractChapter = useCallback((text?: string) => {
    if (!text) return "";
    const match =
      text.match(/(?:ch\.?|chapter)\s*(\d+(\.\d+)?)/i) ||
      text.match(/(\d+(\.\d+)?)/);
    return match?.[1] ? `Ch. ${match[1]}` : text;
  }, []);

  useEffect(() => {
    const update = () => {
      const history = readHistory();
      const current = history.find((h) => h.comicSlug === slug);
      if (current) {
        setLastRead({
          ...current,
          displayChapter: extractChapter(current.lastChapter),
        });
      }
    };
    update();
    window.addEventListener("focus", update);
    return () => window.removeEventListener("focus", update);
  }, [slug, extractChapter]);

  const chapters = data?.chapters ?? [];

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


 

  if (!mounted) return null;

  return (
    <div className="rk-page rk-app-surface w-full pb-28 text-white">
      <div className="relative h-[300px] overflow-hidden sm:h-[360px]">
        <img
          referrerPolicy="no-referrer"
          src={data.thumbnail}
          alt={data.title}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          sizes="100vw"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[var(--background)]/76" />

        <div className="absolute top-4 left-4 right-4 flex justify-between z-20">
          <button
            onClick={() => router.back()}
            className="rk-btn-ghost rounded-full p-3 active:scale-90"
          >
            <FaArrowLeft />
          </button>
          <div className="flex gap-3">
            <button className="rk-btn-ghost rounded-full p-3 active:scale-90">
              <FaHeart />
            </button>
            <button className="rk-btn-ghost rounded-full p-3 active:scale-90">
              <FaCommentDots />
            </button>
          </div>
        </div>
      </div>

      <div className="rk-shell px-4 -mt-14 relative z-10">
        <div className="flex gap-4 items-start">
          <div className="flex-shrink-0">
            <img
              referrerPolicy="no-referrer"
              src={data.thumbnail}
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
                  data.status?.toLowerCase() === "ongoing"
                    ? "text-emerald-300"
                    : "text-violet-200"
                }
              >
                {data.status || "Ongoing"}
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
        <button
          onClick={() => setExpand(!expand)}
          className="mt-2 text-sm font-bold text-cyan-200"
        >
          {expand ? "Tutup" : "Lihat selengkapnya"}
        </button>
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
        lastRead={lastRead}
        source={source}
        isPremium={isPremium}
        user={user}
      />

      <div className="rk-shell px-4 mt-10 border-t border-white/10 pt-10">
        <CommentsSupabase type="komik" slug={`${source}-${slug}`} chapter={undefined} />
      </div>
    </div>
  );
}
