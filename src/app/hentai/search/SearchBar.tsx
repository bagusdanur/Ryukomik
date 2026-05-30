"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function HentaiSearchBar({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setQuery(searchParams.get("q") || "");
      setIsSearching(false);
    });
    return () => cancelAnimationFrame(id);
  }, [searchParams]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) return;

    if (trimmedQuery === (searchParams.get("q") || "").trim()) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    router.push(`/hentai/search?q=${encodeURIComponent(trimmedQuery)}`);
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative flex items-center">
        <div className="absolute left-3 pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white/20">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsSearching(false);
          }}
          placeholder="Cari hentai..."
          className="w-full h-10 pl-9 pr-20 rounded-xl bg-[#1c1c1c] border border-white/5 text-[13px] text-white placeholder:text-white/15 focus:outline-none focus:border-[#ff5078]/30"
        />

        <div className="absolute right-2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white/50"
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
          <button
            type="submit"
            disabled={!query.trim() || query.trim().length < 2 || isSearching}
            className="w-7 h-7 rounded-lg bg-[#ff5078] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
          >
            {isSearching ? (
              <div className="w-3 h-3 rounded-full bg-white/60" />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-white">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {!query && (
        <div className="mt-3">
          <p className="text-[8px] text-white/15 tracking-widest uppercase mb-2">Populer</p>
          <div className="flex flex-wrap gap-1.5">
            {["Overflow", "Boku no Hero", "Naruto", "Rem", "Isekai"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setQuery(tag);
                  router.push(`/hentai/search?q=${encodeURIComponent(tag)}`);
                }}
                className="px-2 py-1 rounded-md bg-[#1c1c1c] border border-white/5 text-[10px] text-white/30 hover:text-[#ffb3c6] hover:border-[#ff5078]/20"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
