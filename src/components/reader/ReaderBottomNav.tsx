import { FiChevronLeft, FiChevronRight, FiHome, FiSettings } from "react-icons/fi";
import { CiBoxList } from "react-icons/ci";
import NavBtn from "./NavBtn";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

interface ReaderBottomNavProps {
  data: {
    prev?: string;
    next?: string;
    mangaId?: string;
  };
  source: string;
  router: AppRouterInstance;
  onSettings: () => void;
}

export default function ReaderBottomNav({ data, source, router, onSettings }: ReaderBottomNavProps) {
  return (
    <div
      className="rk-reader-chrome fixed bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full border p-2 sm:gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <NavBtn
        disabled={!data.prev}
        icon={<FiChevronLeft />}
        onClick={() => router.push(`/chapter/${source}/${data.prev}`)}
      />
      <NavBtn icon={<FiHome />}     onClick={() => router.push("/")} />
      <NavBtn icon={<FiSettings />} onClick={onSettings} />
      <NavBtn
        icon={<CiBoxList />}
        onClick={() => router.push(`/komik/${source}/${data.mangaId}`)}
      />
      <NavBtn
        disabled={!data.next}
        icon={<FiChevronRight />}
        onClick={() => router.push(`/chapter/${source}/${data.next}`)}
      />
    </div>
  );
}
