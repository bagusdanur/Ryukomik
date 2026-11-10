import { useState } from "react";
import { FiChevronLeft, FiChevronRight, FiHome, FiSettings } from "react-icons/fi";
import { CiBoxList } from "react-icons/ci";
import NavBtn from "./NavBtn";
import ReaderChapterListModal, { type ReaderChapterItem } from "./ReaderChapterListModal";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

interface ReaderBottomNavProps {
  data: {
    prev?: string;
    next?: string;
    mangaId?: string;
    chapters?: ReaderChapterItem[];
  };
  /** Slug chapter yang sedang dibaca (mis. "slug/chapter-61"). */
  currentSlug: string;
  source: string;
  router: AppRouterInstance;
  onSettings: () => void;
}

export default function ReaderBottomNav({ data, currentSlug, source, router, onSettings }: ReaderBottomNavProps) {
  const [listOpen, setListOpen] = useState(false);

  return (
    <>
      <div
        className="rk-reader-chrome fixed bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full border p-2 sm:gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <NavBtn
          disabled={!data.prev}
          icon={<FiChevronLeft />}
          onClick={() => router.push(`/chapter/${source}/${data.prev}`)}
        />
        <NavBtn icon={<FiHome />} onClick={() => router.push("/")} />
        <NavBtn icon={<FiSettings />} onClick={onSettings} />
        <NavBtn icon={<CiBoxList />} onClick={() => setListOpen(true)} />
        <NavBtn
          disabled={!data.next}
          icon={<FiChevronRight />}
          onClick={() => router.push(`/chapter/${source}/${data.next}`)}
        />
      </div>

      <ReaderChapterListModal
        open={listOpen}
        onClose={() => setListOpen(false)}
        chapters={data.chapters || []}
        currentSlug={currentSlug}
        source={source}
        mangaId={data.mangaId}
      />
    </>
  );
}
