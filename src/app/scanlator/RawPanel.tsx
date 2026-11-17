"use client";

import { useCallback, useState } from "react";
import { FiAlertTriangle, FiChevronLeft, FiDownload, FiSearch, FiX } from "react-icons/fi";

const SOURCES = [
  { id: "asura", label: "Asura" },
  { id: "demon", label: "Demon" },
  { id: "vortex", label: "Vortex" },
  { id: "qimanga", label: "Qimanga" },
  { id: "thunder", label: "Thunder" },
  { id: "mist", label: "Mist" },
  { id: "lua", label: "Lua" },
  { id: "kagane", label: "Kagane" },
  { id: "dusk", label: "Dusk" },
  { id: "evascan", label: "EvaScan" },
  { id: "lagoon", label: "Lagoon" },
  { id: "doujiva", label: "Doujiva" },
  { id: "mgeko", label: "Mgeko" },
  { id: "mgread", label: "Mgread" },
  { id: "mangadex", label: "MangaDex" },
  { id: "omega", label: "Omega" },
];

type SearchItem = { title: string; slug: string; image: string | null; update: string | null; type: string | null };
type ChapterItem = { title: string; slug: string; date: string | null };

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-[13px] text-white outline-none transition focus:border-[var(--accent)]/50";

/**
 * Tab RAW di Studio Scanlator.
 *
 * Hanya dirender kalau akun punya izin `raw_access`; server tetap memeriksa izin
 * di setiap request, jadi menyembunyikan tab bukan satu-satunya pengaman.
 */
export default function RawPanel({ getToken }: { getToken: () => Promise<string> }) {
  const [source, setSource] = useState("asura");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [series, setSeries] = useState<{ slug: string; title: string } | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyChapter, setBusyChapter] = useState<string | null>(null);

  const authHeader = useCallback(async () => ({ Authorization: `Bearer ${await getToken()}` }), [getToken]);

  const search = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setError("Kata kunci minimal 2 huruf.");
      return;
    }
    setLoading(true); setError(""); setNotice(""); setSeries(null); setChapters([]);
    try {
      const response = await fetch(`/api/scanlator/raw/search?source=${source}&q=${encodeURIComponent(q)}`, {
        headers: await authHeader(),
        cache: "no-store",
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "Pencarian gagal.");
      setResults(json.results || []);
      if (!json.results?.length) setNotice("Tidak ada hasil di sumber ini. Coba kata kunci lain atau sumber lain.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pencarian gagal.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const openSeries = async (item: SearchItem) => {
    setLoading(true); setError(""); setNotice("");
    try {
      const response = await fetch(
        `/api/scanlator/raw/series?source=${source}&slug=${encodeURIComponent(item.slug)}`,
        { headers: await authHeader(), cache: "no-store" },
      );
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "Gagal membuka seri.");
      setSeries({ slug: json.slug, title: json.title });
      setChapters(json.chapters || []);
      if (!json.chapters?.length) setNotice("Seri ini belum punya chapter di sumber.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuka seri.");
    } finally {
      setLoading(false);
    }
  };

  const download = async (chapter: ChapterItem) => {
    setBusyChapter(chapter.slug); setError(""); setNotice("");
    try {
      const response = await fetch("/api/scanlator/raw/token", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ source, slug: series?.slug, chapter: chapter.slug }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || "Gagal menyiapkan unduhan.");

      const link = document.createElement("a");
      link.href = json.url;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setNotice(`Mengunduh ${chapter.title || chapter.slug}. Sisa kuota hari ini: ${json.remaining}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunduh.");
    } finally {
      setBusyChapter(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/[.07] bg-white/[.02] p-3">
        <p className="text-[12px] font-bold">Unduh RAW</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/45">
          Pilih sumber, cari judul, lalu unduh chapter sebagai ZIP. File langsung tersimpan ke perangkat —
          tidak disimpan di server.
        </p>
      </div>

      <form onSubmit={search} className="space-y-2">
        <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}>
          {SOURCES.map((item) => (
            <option key={item.id} value={item.id} className="bg-[#14121c]">{item.label}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Judul seri…"
              className={`${inputClass} pl-9`}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[var(--accent)] px-4 text-[12px] font-bold text-white disabled:opacity-50"
          >
            {loading ? "…" : "Cari"}
          </button>
        </div>
      </form>

      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-[11.5px] text-rose-200">
          <FiAlertTriangle size={13} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
      {notice && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[11.5px] text-emerald-200">{notice}</p>}

      {series ? (
        <div className="rounded-xl border border-white/[.07]">
          <div className="flex items-center gap-2 border-b border-white/[.06] px-3 py-2.5">
            <button type="button" onClick={() => { setSeries(null); setChapters([]); }} className="rounded-lg p-1 text-white/45 hover:bg-white/[.06] hover:text-white">
              <FiChevronLeft size={15} />
            </button>
            <p className="min-w-0 flex-1 truncate text-[12.5px] font-bold">{series.title}</p>
            <span className="text-[10px] text-white/35">{chapters.length} chapter</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {chapters.map((chapter) => (
              <div key={chapter.slug} className="flex items-center gap-2 border-b border-white/[.04] px-3 py-2 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] text-white/80">{chapter.title || chapter.slug}</p>
                  {chapter.date && <p className="text-[10px] text-white/30">{chapter.date}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => void download(chapter)}
                  disabled={busyChapter === chapter.slug}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-2.5 py-1.5 text-[11px] font-bold text-white/90 disabled:opacity-50"
                >
                  <FiDownload size={11} /> {busyChapter === chapter.slug ? "…" : "RAW"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {results.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => void openSeries(item)}
              className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-[#13131a] p-2 text-left transition hover:border-[var(--accent)]/40"
            >
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt="" loading="lazy" className="h-14 w-10 shrink-0 rounded-md object-cover" />
              ) : (
                <div className="h-14 w-10 shrink-0 rounded-md bg-white/[.05]" />
              )}
              <div className="min-w-0">
                <p className="truncate text-[12px] font-bold text-white/85">{item.title}</p>
                <p className="mt-0.5 truncate text-[10.5px] text-white/35">
                  {[item.type, item.update].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
