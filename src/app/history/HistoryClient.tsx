"use client";


import { useEffect, useState } from "react";

import { useHistoryStore } from "@/store/historyStore";

export default function HistoryPage() {
  const history = useHistoryStore((state) => state.history);
  const clearHistory = useHistoryStore((state) => state.clearHistory);

  return (
    <div className="rk-page px-4 pb-24 pt-20 text-white md:px-18">
      <div className="rk-shell">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-black">History</h1>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold hover:bg-rose-400"
          >
            Hapus
          </button>
        )}
      </div>

      <div className="mb-4 h-px bg-white/10" />

      {/* HISTORY LIST */}
      <div className="flex flex-col gap-3">
        {history.map((item, i) => (
          <a
            key={i}
            href={`/chapter/${item.source || "komiku"}/${item.lastChapterSlug ?? (item as any).slug ?? ""}`}
            className="rk-card-soft flex flex-col rounded-2xl p-3 transition hover:border-cyan-200/20 md:flex-row md:items-center md:justify-between"
          >
            {/* Title + chapter */}
            <span className="text-sm md:text-base font-medium">
              {item.title} {item.lastChapter ?? (item as any).chapter}
            </span>

            {/* Date */}
            <span className="text-xs md:text-sm text-gray-300 mt-1 md:mt-0">
              {(item as any).date || new Date(item.updatedAt || Date.now()).toLocaleDateString("id-ID")}
            </span>
          </a>
        ))}
      </div>

      {history.length === 0 && (
        <p className="rk-card-soft mt-10 rounded-2xl py-10 text-center text-white/60">Belum ada history...</p>
      )}
      </div>
    </div>
  );
}
