"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useHistoryStore } from "@/store/historyStore";
import CommentsSupabase from "@/components/CommentsSupabase";
import { FiMessageCircle, FiX } from "react-icons/fi";

type ReaderSettings = {
  fontSize?: number;
  lineHeight?: number;
  scrollSpeed?: number;
};

type NovelChapterData = {
  success?: boolean;
  title?: string;
  contentHtml?: string;
  series?: string;
  source?: string;
  prev?: string;
  next?: string;
  [key: string]: unknown;
};

type NovelReaderClientProps = {
  data: NovelChapterData | null;
  slugStr: string;
};

function parseReaderSettings(value: string | null): ReaderSettings | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as ReaderSettings;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export default function NovelReaderClient({ data, slugStr }: NovelReaderClientProps) {
  const router = useRouter();

  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [showSettings, setShowSettings] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [showUI, setShowUI] = useState(true);
  const [showComment, setShowComment] = useState(false);
  const scrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const addHistory = useHistoryStore((state) => state.addHistory);

  // Load settings
  useEffect(() => {
    const p = parseReaderSettings(localStorage.getItem("readerSettings"));
    if (p) {
      requestAnimationFrame(() => {
        setFontSize(p.fontSize || 18);
        setLineHeight(p.lineHeight || 1.8);
        setScrollSpeed(p.scrollSpeed || 1);
      });
    }
  }, []);

  // Save settings
  useEffect(() => {
    localStorage.setItem("readerSettings", JSON.stringify({ fontSize, lineHeight, scrollSpeed }));
  }, [fontSize, lineHeight, scrollSpeed]);

  // Auto scroll
  useEffect(() => {
    if (isAutoScrolling) {
      scrollInterval.current = setInterval(() => window.scrollBy(0, scrollSpeed), 30);
    } else {
      if (scrollInterval.current) clearInterval(scrollInterval.current);
    }
    return () => {
      if (scrollInterval.current) clearInterval(scrollInterval.current);
    };
  }, [isAutoScrolling, scrollSpeed]);

  // Save history
  useEffect(() => {
    if (!data) return;
    const newEntry = {
      comicSlug: data.series || "",
      lastChapterSlug: slugStr,
      lastChapter: data.title || "",
      title: data.title || "",
      source: data.source || "",
      updatedAt: Date.now(),
    };
    addHistory(newEntry);
  }, [data, slugStr, addHistory]);

  const cleanHtml = (html?: string) => {
    if (!html) return "";
    return html
      .replace(/<input[^>]*>/g, "")
      .replace(/<div id="text-chapter-toolbar">.*?<\/div>/gs, "");
  };

  if (!data) return (
    <div className="p-4 text-center text-white bg-[#282828] min-h-screen">
      Chapter tidak ditemukan.{" "}
      <button onClick={() => router.refresh()} className="underline">Coba lagi</button>
    </div>
  );

  return (
    <div
      className="bg-[#282828] text-gray-200 min-h-screen transition-all duration-300"
      onClick={() => setShowUI(!showUI)} // Toggle UI saat layar di-tap
    >
      {/* 1. TOP NAVBAR (Floating & Auto-hide) */}
      <nav
        className={`fixed top-0 left-0 right-0 z- bg-[#1a1a1a]/90 backdrop-blur-md border-b border-white/5 h-14 flex items-center justify-between px-4 transition-transform duration-500 ${showUI ? "translate-y-0" : "-translate-y-full"}`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/novel/${data.series}`);
          }}
          className="flex items-center gap-2 text-xs font-bold text-[#7d5fff] hover:bg-[#7d5fff]/10 px-3 py-2 rounded-lg transition"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M10 19l-7-7 m0 0l7-7 m-7 7h18"
            />
          </svg>
          DETAIL
        </button>

        <div className="flex-1 px-4 overflow-hidden text-center">
          <h1 className="text-[10px] font-bold text-gray-400 truncate uppercase tracking-widest leading-none">
            {data.title}
          </h1>
        </div>
        <button
          className={`p-2 rounded-full transition ${showComment ? "bg-[#7d5fff] text-white" : "hover:bg-white/10"}`}
          onClick={() => setShowComment(true)}
        >
          <FiMessageCircle size={20} />{" "}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowSettings(!showSettings);
          }}
          className={`p-2 rounded-full transition ${showSettings ? "bg-[#7d5fff] text-white" : "hover:bg-white/10"}`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </nav>

      {/* 2. READER SETTINGS PANEL */}
      {showSettings && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed top-16 right-4 z- bg-[#1a1a1a] border border-white/10 p-5 rounded-2xl shadow-2xl w-72 animate-in fade-in zoom-in duration-200"
        >
          <div className="space-y-5">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-black mb-3 tracking-tighter">
                Ukuran Teks ({fontSize}px)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setFontSize((f) => Math.max(12, f - 2))}
                  className="flex-1 bg-white/5 hover:bg-[#7d5fff]/20 py-2 rounded-xl border border-white/5"
                >
                  -
                </button>
                <button
                  onClick={() => setFontSize((f) => Math.min(32, f + 2))}
                  className="flex-1 bg-white/5 hover:bg-[#7d5fff]/20 py-2 rounded-xl border border-white/5"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">
                Jarak Baris
              </p>

              <div className="flex gap-2">
                {[1.5, 1.8, 2.2].map((v) => (
                  <button
                    key={v}
                    onClick={() => setLineHeight(v)}
                    className={`flex-1 py-1 rounded-md text-xs ${lineHeight === v ? "bg-[#7d5fff]" : "bg-white/5"}`}
                  >
                    {v === 1.5 ? "Rapat" : v === 1.8 ? "Normal" : "Lebar"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-black mb-3 tracking-tighter">
                Auto Scroll Speed
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={scrollSpeed}
                  onChange={(e) => setScrollSpeed(Number(e.target.value))}
                  className="flex-1 accent-[#7d5fff]"
                />
                <button
                  onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${isAutoScrolling ? "bg-red-500 text-white" : "bg-[#7d5fff] text-white"}`}
                >
                  {isAutoScrolling ? "STOP" : "START"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN CONTENT */}
      <main
        className="max-w-2xl mx-auto px-6 py-20 min-h-screen"
        style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight }}
      >
        <header className="mb-12 text-center">
          <h2 className="text-2xl font-serif font-black text-white mb-4 leading-tight italic">
            {data.title}
          </h2>
          <div className="h-1.5 w-16 bg-[#7d5fff] mx-auto rounded-full"></div>
        </header>

        <article
          className="novel-content font-serif text-gray-300 antialiased"
          dangerouslySetInnerHTML={{ __html: cleanHtml(data.contentHtml) }}
        />

        {/* Space for Bottom UI */}
        <div className="h-32"></div>
      </main>

      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z- flex items-center gap-1 sm:gap-3 px-2 py-1.5 sm:p-2 bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl shadow-xl transition-all duration-500 ${
          showUI ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        }`}
      >
        {/* PREV */}
        <button
          disabled={!data.prev}
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/novel/chapter/${data.prev}`);
          }}
          className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-6 sm:py-3 bg-[#7d5fff] text-white rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold active:scale-95 disabled:opacity-30"
        >
          <svg
            className="w-3 h-3 sm:w-5 sm:h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className=" sm:inline">PREV</span>
        </button>

        <div className="h-4 sm:h-6 w-[1px] bg-white/10 mx-1"></div>

        {/* TOP */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="px-2 py-1 sm:px-6 sm:py-3 text-[10px] sm:text-base font-bold text-[#7d5fff] active:opacity-50"
        >
          TOP
        </button>

        <div className="h-4 sm:h-6 w-[1px] bg-white/10 mx-1"></div>

        {/* NEXT */}
        <button
          disabled={!data.next}
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/novel/chapter/${data.next}`);
          }}
          className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-6 sm:py-3 bg-[#7d5fff] text-white rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold active:scale-95 disabled:opacity-30"
        >
          <span className=" sm:inline">NEXT</span>
          <svg
            className="w-3 h-3 sm:w-5 sm:h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      
      {showComment && (
        <div className="fixed inset-0 bg-black/80 z-20 flex items-end">
          <div className="bg-[#111] w-full max-h-[90vh] rounded-t-2xl shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <span className="font-bold text-lg">Komentar</span>
              <button
                onClick={() => setShowComment(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <CommentsSupabase
                type="chapter"
                slug={`${data.source}-${slugStr}`}
                chapter={undefined}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
