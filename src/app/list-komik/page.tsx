"use client";
import { useRouter } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { FaFilter } from "react-icons/fa";
import KomikSkeleton from "./KomikSkeleton";
import { FiSearch } from "react-icons/fi";
import type { ListKomikItem } from "@/types/content";

interface ListResponse {
  data?: ListKomikItem[];
  meta?: {
    totalKomik?: number;
  };
}

interface CachedList {
  data: ListKomikItem[];
  total: number;
  time?: number;
}

const getSlugFromLink = (url: string) => {
  const parts = url.split("/").filter(Boolean);
  return parts[parts.length - 1];
};

export default function KomikList() {
  const router = useRouter();
  const [data, setData] = useState<ListKomikItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [huruf, setHuruf] = useState("");
  const [tipe, setTipe] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  const fetchData = useCallback(async function fetchData() {
    const cacheKey = `komiku:${page}:${huruf}:${tipe}`;
    const cached = sessionStorage.getItem(cacheKey);

    // ================= CACHE HIT =================
    if (cached) {
      const parsed = JSON.parse(cached) as CachedList;
      setData(parsed.data);
      setTotal(parsed.total);
      setLoading(false);
      return;
    }

    // ================= FETCH =================
    setLoading(true);

    const params = new URLSearchParams();
    params.set("page", String(page));
    if (huruf) params.set("huruf", huruf);
    if (tipe) params.set("tipe", tipe);

    const res = await fetch(`/api/source/komiku/list?${params.toString()}`);
    const json = (await res.json()) as ListResponse;

    setData(json.data || []);
    setTotal(json.meta?.totalKomik || 0);

    // ================= SAVE CACHE =================
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: json.data || [],
        total: json.meta?.totalKomik || 0,
        time: Date.now(),
      })
    );

    setLoading(false);
  }, [huruf, page, tipe]);

  useEffect(() => {
    const id = requestAnimationFrame(() => fetchData());
    return () => cancelAnimationFrame(id);
  }, [fetchData]);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="rk-page px-4 pb-24 pt-20">
      <div className="rk-shell">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/60">
          Catalog
        </p>
        <h1 className="text-2xl font-black text-white">List Komik</h1>
      </div>
      {/* FILTER BUTTON */}
      <div className="flex justify-end mb-4 gap-2">
        {/* SEARCH */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const searchInput = form.elements.namedItem("search");
            const q = searchInput instanceof HTMLInputElement ? searchInput.value.trim() : "";
            if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
          }}
          className="rk-input flex items-center gap-2 flex-1 min-w-0 rounded-2xl px-3 py-2.5"
        >
          <FiSearch className="text-white/50 shrink-0" />

          <input
            name="search"
            type="text"
            placeholder="Cari komik..."
            className="bg-transparent outline-none text-sm text-white placeholder-white/50 flex-1 min-w-0"
          />

          <button
            type="submit"
            className="text-white/70 hover:text-white shrink-0 transition-colors duration-200"
            aria-label="Cari"
          >
            <FiSearch size={18} />
          </button>
        </form>
        <button
          onClick={() => setShowFilter(!showFilter)}
          className="rk-btn-ghost rounded-2xl px-3 py-3"
        >
          <FaFilter />
        </button>
      </div>

      {/* FILTER PANEL */}
      {showFilter && (
        <div className="rk-card mb-4 rounded-2xl p-4">
          <p className="text-sm font-semibold mb-3">Filter</p>

          {/* TIPE */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {["", "manga", "manhwa", "manhua"].map((t) => (
              <button
                key={t || "all"}
                onClick={() => {
                  setTipe(t);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded text-sm ${
                  tipe === t ? "bg-violet-500/25 text-cyan-100" : "bg-white/10"
                }`}
              >
                {t || "All"}
              </button>
            ))}
          </div>

          {/* HURUF */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setHuruf("");
                setPage(1);
              }}
              className={`text-xs px-3 py-1 rounded ${
                huruf === "" ? "bg-violet-500/25 text-cyan-100" : "bg-white/10"
              }`}
            >
              All
            </button>

            {alphabet.map((l) => (
              <button
                key={l}
                onClick={() => {
                  setHuruf(l);
                  setPage(1);
                }}
                className={`text-xs px-3 py-1 rounded ${
                  huruf === l ? "bg-violet-500/25 text-cyan-100" : "bg-white/10"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TOTAL */}
      <p className="text-center text-white/60 text-sm mb-4">
        Total: <b>{total}</b>
      </p>

      {/* LIST */}
      {loading ? (
        <KomikSkeleton count={9} />
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {data.map((item, idx) => {
            const slug = getSlugFromLink(item.link);

            return (
              <a key={idx} href={`/komik/komiku/${slug}`} className="group">
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="mt-2">
                  <p className="text-sm font-bold leading-snug text-white/90 line-clamp-2 transition-colors duration-200 group-hover:text-cyan-100">
                    {item.title}
                  </p>
                  <p className="text-xs text-violet-200/70">{item.status}</p>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* PAGINATION */}
      <div className="flex justify-center items-center mt-6 gap-3">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="rk-btn-ghost rounded-xl px-4 py-2 disabled:opacity-30"
        >
          Prev
        </button>

        <span className="text-white/60 text-sm">Page {page}</span>

        <button
          onClick={() => setPage(page + 1)}
          className="rk-btn-ghost rounded-xl px-4 py-2"
        >
          Next
        </button>
      </div>
      </div>
    </div>
  );
}
