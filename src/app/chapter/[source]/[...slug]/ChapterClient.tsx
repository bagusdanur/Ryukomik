"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import type { ReaderChapter } from "@/types/content";
import type { ReadHistoryItem } from "@/types/user";


import { useReaderStore } from "@/store/readerStore";
import { useAutoScroll } from "@/components/reader/hooks/useAutoScroll";
import { useHistoryStore } from "@/store/historyStore";
import { useScrollBehavior } from "@/components/reader/hooks/useScrollBehavior";
import { useTapScroll } from "@/components/reader/hooks/useTapScroll";
import { useXpRead, useXpQueueFlush } from "@/hooks/useXpRead";
import { useProjectViewCounter } from "@/hooks/useProjectViewCounter";

import ReaderTopBar from "@/components/reader/ReaderTopBar";
import ReaderImages from "@/components/reader/ReaderImages";
import ReaderBottomNav from "@/components/reader/ReaderBottomNav";
import ReaderSideActions from "@/components/reader/ReaderSideActions";
import ReaderSettingModal from "@/components/reader/ReaderSettingModal";
import ReaderProgress from "@/components/reader/ReaderProgress";
import ReaderSupportAd from "@/components/reader/ReaderSupportAd";
import ReaderEndSection from "@/components/reader/ReaderEndSection";

interface ChapterClientProps {
  data: ReaderChapter;
  error?: unknown;
  source: string;
  slugStr: string;
  imageAccessToken?: string;
}

export default function ChapterClient({ data, error, source, slugStr, imageAccessToken }: ChapterClientProps) {
  const router = useRouter();
  const [showUI, setShowUI] = useState(true);
  const [showSetting, setShowSetting] = useState(false);
  const needsImageAccess = Boolean(data?.images?.some((url) => {
    try {
      return new URL(url).hostname === "storage.ryukomik.my.id" && new URL(url).pathname.startsWith("/chapters/");
    } catch {
      return false;
    }
  }));
  const [imageAccessReady, setImageAccessReady] = useState(!needsImageAccess);
  const [imageAccessError, setImageAccessError] = useState(false);
  const { user } = useSupabaseUser();

  useXpQueueFlush();
  useXpRead({ user, slugStr });
  useProjectViewCounter(source, data?.mangaId, slugStr);

  const settings = useReaderStore();
  const addHistory = useHistoryStore((state) => state.addHistory);
  const autoScroll = useAutoScroll(settings.scrollSpeed);

  useEffect(() => {
    if (!needsImageAccess) {
      setImageAccessReady(true);
      setImageAccessError(false);
      return;
    }
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setInterval> | undefined;

    const issueAccess = async () => {
      try {
        const response = await fetch("/api/image-session", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: {
            "content-type": "application/json",
            ...(imageAccessToken ? { authorization: `Bearer ${imageAccessToken}` } : {}),
          },
          body: JSON.stringify({ chapter: slugStr }),
        });
        if (!response.ok) throw new Error(`image session ${response.status}`);
        if (!cancelled) {
          setImageAccessReady(true);
          setImageAccessError(false);
        }
      } catch {
        if (!cancelled) {
          setImageAccessReady(false);
          setImageAccessError(true);
        }
      }
    };

    setImageAccessReady(false);
    setImageAccessError(false);
    void issueAccess();
    refreshTimer = setInterval(() => void issueAccess(), 90 * 60 * 1000);
    return () => {
      cancelled = true;
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [imageAccessToken, needsImageAccess, slugStr]);

  useScrollBehavior({
    autoNext: settings.autoNext,
    nextSlug: data?.next,
    source,
    router,
    slugStr,
    onScrollDown: () => setShowUI(false),
    onStopAutoScroll: autoScroll.stop,
  });

  const { handleTap, tapHint } = useTapScroll({
    tapScrollAmount: settings.tapScrollAmount,
    isAutoScrolling: autoScroll.active,
    stopAutoScroll: autoScroll.stop,
    setShowUI,
  });

  const scrollToComments = () => {
    document.getElementById("chapter-comments")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // History
  useEffect(() => {
    if (!data) return;
    const entry: ReadHistoryItem = {
      comicSlug: data.mangaId || "",
      lastChapterSlug: slugStr,
      lastChapter: data.currentChapter,
      title: data.title,
      source,
      updatedAt: Date.now(),
    };
    addHistory(entry);
  }, [data, slugStr, source, addHistory]);

  // Page title
  useEffect(() => {
    if (!data) return;
    const title =
      slugStr?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
      "";
    document.title = `${title} ${data.currentChapter} - Ryukomik`;
  }, [data, slugStr]);

  if (!data || error) return null;

  return (
    <div
      className="relative min-h-screen select-none bg-[var(--background)] text-white"
      onClick={handleTap}
    >
      {showUI && <ReaderTopBar title={slugStr} chapter={data.currentChapter} />}

      <ReaderSupportAd />

      {imageAccessReady ? <ReaderImages
        images={data.images}
        slugStr={slugStr}
        source={source}
        tapHint={tapHint}
        showUI={showUI}
        readingMode={settings.readingMode}
        imageScaling={settings.imageScaling}
        pageSpacing={settings.pageSpacing}
        nextChapterSlug={data.next}
      /> : (
        <div className="flex min-h-[45vh] items-center justify-center px-6 text-center text-sm text-white/60">
          {imageAccessError ? (
            <button type="button" onClick={() => window.location.reload()} className="rounded-lg border border-white/15 px-4 py-2 text-white/80">
              Akses gambar gagal. Ketuk untuk mencoba lagi.
            </button>
          ) : "Menyiapkan gambar chapter..."}
        </div>
      )}
      <ReaderEndSection
        source={source}
        slugStr={slugStr}
        mangaSlug={data.mangaId}
        previousSlug={data.prev}
        nextSlug={data.next}
      />
      <ReaderProgress 
        images={data.images}
        slugStr={slugStr}
      />

      {showUI && (
        <>
          <ReaderBottomNav
            data={data}
            source={source}
            router={router}
            onSettings={() => setShowSetting(true)}
          />
          <ReaderSideActions
            autoScroll={autoScroll.active}
            onToggleAutoScroll={autoScroll.toggle}
            onComment={scrollToComments}
          />
        </>
      )}

      {showSetting && (
        <ReaderSettingModal
          settings={settings}
          onClose={() => setShowSetting(false)}
        />
      )}
    </div>
  );
}
