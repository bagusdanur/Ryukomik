import { useMemo } from "react";

interface ReaderTopBarProps {
  title?: string;
  chapter?: string;
}

export default function ReaderTopBar({ title, chapter }: ReaderTopBarProps) {
  const formatted = useMemo(
    () => title?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "",
    [title],
  );

  return (
    <div className="rk-reader-chrome fixed left-0 right-0 top-0 z-10 border-b">
      <div className="mx-auto max-w-3xl truncate px-4 py-3 text-center text-xs font-bold text-white/90 sm:text-sm">
        {formatted} - {chapter}
      </div>
    </div>
  );
}
