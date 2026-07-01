"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import type { ReaderChapter } from "@/types/content";
import type { ReadHistoryItem } from "@/types/user";


import { useReaderStore } from "@/store/readerStore";
import { useAutoScroll } from "@/components/reader/hooks/useAutoScroll";
import { useScrollBehavior } from "@/components/reader/hooks/useScrollBehavior";
import { useTapScroll } from "@/components/reader/hooks/useTapScroll";
import { useXpRead, useXpQueueFlush } from "@/hooks/useXpRead";

import ReaderTopBar from "@/components/reader/ReaderTopBar";
import ReaderImages from "@/components/reader/ReaderImages";
import ReaderBottomNav from "@/components/reader/ReaderBottomNav";
import ReaderSideActions from "@/components/reader/ReaderSideActions";
import ReaderSettingModal from "@/components/reader/ReaderSettingModal";
import ReaderCommentModal from "@/components/reader/ReaderCommentModal";
import ReaderProgress from "@/components/reader/ReaderProgress";
import ReaderSupportAd from "@/components/reader/ReaderSupportAd";

interface ChapterClientProps {
  data: ReaderChapter;
  error?: unknown;
  source: string;
  slugStr: string;
}

export default function ChapterClient({ data, error, source, slugStr }: ChapterClientProps) {
  const router = useRouter();
  const [showUI, setShowUI] = useState(true);
  const [showSetting, setShowSetting] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const { user } = useSupabaseUser();

  useXpQueueFlush();
  useXpRead({ user, slugStr });

  const settings = useReaderStore();
  const autoScroll = useAutoScroll(settings.scrollSpeed);

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

  // History
  useEffect(() => {
    if (!data) return;
    const history = JSON.parse(localStorage.getItem("read_history") || "[]") as ReadHistoryItem[];
    const entry: ReadHistoryItem = {
      comicSlug: data.mangaId || "",
      lastChapterSlug: slugStr,
      lastChapter: data.currentChapter,
      title: data.title,
      source,
      updatedAt: Date.now(),
    };
    const filtered = history.filter((h) => h.comicSlug !== data.mangaId);
    filtered.unshift(entry);
    localStorage.setItem("read_history", JSON.stringify(filtered.slice(0, 50)));
  }, [data, slugStr, source]);

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

      <ReaderImages
        images={data.images}
        slugStr={slugStr}
        source={source}
        tapHint={tapHint}
        showUI={showUI}
        readingMode={settings.readingMode}
        imageScaling={settings.imageScaling}
        pageSpacing={settings.pageSpacing}
        nextChapterSlug={data.next}
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
            onComment={() => setShowComment(true)}
          />
        </>
      )}

      {showSetting && (
        <ReaderSettingModal
          settings={settings}
          onClose={() => setShowSetting(false)}
        />
      )}
      {showComment && (
        <ReaderCommentModal
          source={source}
          slugStr={slugStr}
          onClose={() => setShowComment(false)}
        />
      )}
    </div>
  );
}
