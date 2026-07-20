"use client";

import { useState, useEffect, useCallback, FormEvent, useRef, useMemo } from "react";
import {
  FiBookOpen as FiBookOpenIcon,
  FiPlus as FiPlusIcon,
  FiImage as FiImageIcon,
  FiUploadCloud as FiUploadCloudIcon,
  FiTrash2 as FiTrash2Icon,
  FiChevronLeft as FiChevronLeftIcon,
  FiSave as FiSaveIcon,
  FiEdit2 as FiEdit2Icon,
  FiSearch as FiSearchIcon,
  FiCheck as FiCheckIcon,
  FiX as FiXIcon,
} from "react-icons/fi";

type Manga = {
  id: string;
  slug: string;
  title: string;
  cover_url?: string;
  description?: string;
  author?: string;
  status: string;
  type: string;
  genres: string[];
  created_at: string;
};

type Chapter = {
  id: string;
  manga_slug: string;
  chapter_number: number;
  title?: string;
  image_urls: string[];
  uploaded_at: string;
};

interface ProjectTabProps {
  getAdminToken: () => Promise<string>;
}

export default function ProjectTab({ getAdminToken }: ProjectTabProps) {
  const [view, setView] = useState<"mangaList" | "mangaForm" | "chapterList" | "chapterForm">("mangaList");

  // Data
  const [mangaList, setMangaList] = useState<Manga[]>([]);
  const [activeManga, setActiveManga] = useState<Manga | null>(null);
  const [chapterList, setChapterList] = useState<Chapter[]>([]);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Forms
  const [mangaForm, setMangaForm] = useState<Partial<Manga>>({});
  const [chapterForm, setChapterForm] = useState<Partial<Chapter>>({});
  const [uploadProgress, setUploadProgress] = useState(0);

  // Search
  const [chapterSearch, setChapterSearch] = useState("");
  const [mangaSearch, setMangaSearch] = useState("");

  // Bulk delete
  const [selectedManga, setSelectedManga] = useState<Set<string>>(new Set());
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // ─── FILTERED DATA ──────────────────────────────────────────
  const filteredManga = useMemo(() => {
    if (!mangaSearch.trim()) return mangaList;
    const q = mangaSearch.toLowerCase();
    return mangaList.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        m.author?.toLowerCase().includes(q)
    );
  }, [mangaList, mangaSearch]);

  const filteredChapters = useMemo(() => {
    if (!chapterSearch.trim()) return chapterList;
    const q = chapterSearch.toLowerCase();
    return chapterList.filter(
      (c) =>
        `chapter ${c.chapter_number}`.includes(q) ||
        c.title?.toLowerCase().includes(q)
    );
  }, [chapterList, chapterSearch]);

  // ─── MANGA ACTIONS ──────────────────────────────────────────
  const fetchManga = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAdminToken();
      const res = await fetch("/api/admin/project/manga", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setMangaList(json.data || []);
    } finally {
      setLoading(false);
    }
  }, [getAdminToken]);

  useEffect(() => {
    if (view === "mangaList") fetchManga();
  }, [view, fetchManga]);

  const saveManga = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await getAdminToken();
      const method = mangaForm.id ? "PATCH" : "POST";
      const res = await fetch("/api/admin/project/manga", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(mangaForm),
      });
      if (!res.ok) throw new Error("Gagal menyimpan manga");
      setView("mangaList");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteManga = async (id: string) => {
    const manga = mangaList.find((m) => m.id === id);
    const title = manga?.title || "ini";
    if (
      !confirm(
        `⚠️ HAPUS PERMANEN?\n\n"${title}"\n\nYang akan dihapus:\n• Data manga dari database\n• Semua chapter terkait\n• Cover image dari R2 storage\n• Semua gambar chapter dari R2\n\nTindakan ini TIDAK BISA dibatalkan!`
      )
    )
      return;
    try {
      const token = await getAdminToken();
      await fetch(`/api/admin/project/manga?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchManga();
    } catch (err) {
      alert("Gagal menghapus manga");
    }
  };

  const bulkDeleteManga = async () => {
    if (selectedManga.size === 0) return;
    if (
      !confirm(
        `⚠️ HAPUS ${selectedManga.size} MANGA?\n\nSemua manga terpilih, chapter, dan R2 files akan dihapus permanen!`
      )
    )
      return;
    setLoading(true);
    try {
      const token = await getAdminToken();
      for (const id of selectedManga) {
        await fetch(`/api/admin/project/manga?id=${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setSelectedManga(new Set());
      setBulkMode(false);
      fetchManga();
    } catch (err) {
      alert("Gagal menghapus manga");
    } finally {
      setLoading(false);
    }
  };

  const uploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      alert("Hanya JPEG, PNG, atau WebP yang diizinkan!");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("manga_slug", mangaForm.slug || "new-manga");
    formData.append("type", "cover");

    setUploading(true);
    try {
      const token = await getAdminToken();
      const res = await fetch("/api/admin/project/upload-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setMangaForm({ ...mangaForm, cover_url: data.url });
      }
    } catch (err) {
      alert("Gagal upload cover");
    } finally {
      setUploading(false);
    }
  };

  // ─── CHAPTER ACTIONS ────────────────────────────────────────
  const fetchChapters = useCallback(
    async (slug: string) => {
      setLoading(true);
      try {
        const token = await getAdminToken();
        const res = await fetch(`/api/admin/project/chapter?manga_slug=${slug}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setChapterList(json.data || []);
      } finally {
        setLoading(false);
      }
    },
    [getAdminToken]
  );

  const openChapters = (manga: Manga) => {
    setActiveManga(manga);
    fetchChapters(manga.slug);
    setView("chapterList");
    setChapterSearch("");
    setBulkMode(false);
    setSelectedChapters(new Set());
  };

  const saveChapter = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await getAdminToken();
      const method = chapterForm.id ? "PATCH" : "POST";
      const payload = {
        ...chapterForm,
        manga_slug: activeManga?.slug,
      };

      const res = await fetch("/api/admin/project/chapter", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Gagal menyimpan chapter");

      setView("chapterList");
      fetchChapters(activeManga!.slug);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteChapter = async (id: string) => {
    const chap = chapterList.find((c) => c.id === id);
    const label = chap ? `Chapter ${chap.chapter_number}` : "ini";
    if (
      !confirm(
        `⚠️ HAPUS PERMANEN?\n\n"${label}"\n\nYang akan dihapus:\n• Data chapter dari database\n• Semua gambar chapter dari R2 storage\n\nTindakan ini TIDAK BISA dibatalkan!`
      )
    )
      return;
    try {
      const token = await getAdminToken();
      await fetch(`/api/admin/project/chapter?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchChapters(activeManga!.slug);
    } catch (err) {
      alert("Gagal menghapus chapter");
    }
  };

  const bulkDeleteChapters = async () => {
    if (selectedChapters.size === 0) return;
    if (
      !confirm(
        `⚠️ HAPUS ${selectedChapters.size} CHAPTER?\n\nSemua chapter terpilih dan gambar R2 akan dihapus permanen!`
      )
    )
      return;
    setLoading(true);
    try {
      const token = await getAdminToken();
      for (const id of selectedChapters) {
        await fetch(`/api/admin/project/chapter?id=${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setSelectedChapters(new Set());
      setBulkMode(false);
      fetchChapters(activeManga!.slug);
    } catch (err) {
      alert("Gagal menghapus chapter");
    } finally {
      setLoading(false);
    }
  };

  const toggleMangaSelect = (id: string) => {
    setSelectedManga((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleChapterSelect = (id: string) => {
    setSelectedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const uploadChapterImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !activeManga || !chapterForm.chapter_number) {
      alert("Isi nomor chapter dulu sebelum upload gambar!");
      return;
    }

    const files = Array.from(e.target.files).sort((a, b) => a.name.localeCompare(b.name));
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    const invalid = files.filter((f) => !allowed.includes(f.type));
    if (invalid.length > 0) {
      alert(`File berikut bukan JPEG/PNG/WebP:\n${invalid.map((f) => f.name).join("\n")}`);
      return;
    }
    const token = await getAdminToken();
    const urls: string[] = [];

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("manga_slug", activeManga.slug);
        formData.append("chapter_number", String(chapterForm.chapter_number));
        formData.append("type", "chapter");

        const res = await fetch("/api/admin/project/upload-image", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const data = await res.json();
        if (data.url) urls.push(data.url);

        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      setChapterForm((prev) => ({
        ...prev,
        image_urls: [...(prev.image_urls || []), ...urls],
      }));
    } catch (err) {
      alert("Ada gambar yang gagal diupload");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── MANGA FORM VIEW ────────────────────────────────────────
  if (view === "mangaForm") {
    return (
      <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setView("mangaList")}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <FiChevronLeftIcon />
          </button>
          <div>
            <h2 className="text-lg sm:text-xl font-bold">
              {mangaForm.id ? "Edit Project Manga" : "Tambah Project Baru"}
            </h2>
            <p className="text-xs text-white/40">
              {mangaForm.id ? "Perbarui informasi manga" : "Upload karya mandiri kamu ke Ryukomik"}
            </p>
          </div>
        </div>

        <form onSubmit={saveManga} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cover */}
          <div className="md:col-span-1 space-y-4">
            <div className="aspect-[3/4] w-full rounded-2xl border-2 border-dashed border-white/10 bg-white/5 overflow-hidden flex flex-col items-center justify-center relative group">
              {mangaForm.cover_url ? (
                <>
                  <img src={mangaForm.cover_url} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="px-4 py-2 bg-white/20 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-white/30 text-white"
                    >
                      <FiUploadCloudIcon /> Ganti Cover
                    </button>
                    <button
                      type="button"
                      onClick={() => setMangaForm({ ...mangaForm, cover_url: "" })}
                      className="px-4 py-2 bg-rose-500/20 text-rose-400 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-rose-500/30"
                    >
                      <FiTrash2Icon /> Hapus
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="flex flex-col items-center justify-center text-white/30 hover:text-white/60 transition-colors p-6"
                >
                  {uploading ? (
                    <div className="w-8 h-8 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin mb-2" />
                  ) : (
                    <FiImageIcon size={32} className="mb-2 opacity-50" />
                  )}
                  <span className="text-sm font-medium">{uploading ? "Mengunggah..." : "Upload Cover"}</span>
                  <span className="text-[10px] mt-1 text-center">JPEG/PNG max 2MB, rasio 3:4</span>
                </button>
              )}
              <input type="file" ref={coverInputRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={uploadCover} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1 block">
                Atau URL Gambar
              </label>
              <input
                value={mangaForm.cover_url || ""}
                onChange={(e) => setMangaForm({ ...mangaForm, cover_url: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#7c5cfc]/50 transition-colors"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Details */}
          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1 block">
                  Judul Manga *
                </label>
                <input
                  required
                  value={mangaForm.title || ""}
                  onChange={(e) => {
                    const title = e.target.value;
                    const slug = title
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/(^-|-$)/g, "");
                    setMangaForm({ ...mangaForm, title, slug: mangaForm.id ? mangaForm.slug : slug });
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#7c5cfc]/50 transition-colors"
                  placeholder="Judul karya kamu..."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1 block">
                  URL Slug *
                </label>
                <input
                  required
                  value={mangaForm.slug || ""}
                  onChange={(e) => setMangaForm({ ...mangaForm, slug: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#7c5cfc]/50 transition-colors"
                  placeholder="url-karya-kamu"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1 block">
                  Author
                </label>
                <input
                  value={mangaForm.author || ""}
                  onChange={(e) => setMangaForm({ ...mangaForm, author: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#7c5cfc]/50 transition-colors"
                  placeholder="Nama Author"
                />
              </div>
              <div className="col-span-2 sm:col-span-1 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1 block">
                    Tipe
                  </label>
                  <select
                    value={mangaForm.type || "manga"}
                    onChange={(e) => setMangaForm({ ...mangaForm, type: e.target.value })}
                    className="w-full bg-[#13131a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#7c5cfc]/50"
                  >
                    <option value="manga">Manga</option>
                    <option value="manhwa">Manhwa</option>
                    <option value="manhua">Manhua</option>
                    <option value="comic">Comic</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1 block">
                    Status
                  </label>
                  <select
                    value={mangaForm.status || "ongoing"}
                    onChange={(e) => setMangaForm({ ...mangaForm, status: e.target.value })}
                    className="w-full bg-[#13131a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#7c5cfc]/50"
                  >
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="hiatus">Hiatus</option>
                    <option value="dropped">Dropped</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1 block">
                Genre (Pisahkan koma)
              </label>
              <input
                value={mangaForm.genres?.join(", ") || ""}
                onChange={(e) =>
                  setMangaForm({
                    ...mangaForm,
                    genres: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#7c5cfc]/50 transition-colors"
                placeholder="Action, Fantasy, Comedy, Romance"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1 block">
                Sinopsis
              </label>
              <textarea
                value={mangaForm.description || ""}
                onChange={(e) => setMangaForm({ ...mangaForm, description: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm h-28 resize-none outline-none focus:border-[#7c5cfc]/50 transition-colors"
                placeholder="Tuliskan sinopsis singkat..."
              />
            </div>

            <div className="pt-2">
              <button
                disabled={loading}
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-[#7c5cfc] to-[#9b83fc] hover:from-[#6b4ae6] hover:to-[#8a72ec] rounded-xl font-bold flex items-center justify-center gap-2 text-white shadow-lg shadow-[#7c5cfc]/20 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <FiSaveIcon /> Simpan Project Manga
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ─── CHAPTER LIST VIEW ──────────────────────────────────────
  if (view === "chapterList") {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView("mangaList")}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10"
          >
            <FiChevronLeftIcon />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base sm:text-lg leading-tight truncate">{activeManga?.title}</h2>
            <p className="text-xs text-white/40">
              {chapterList.length} chapter
              {bulkMode && selectedChapters.size > 0 && ` • ${selectedChapters.size} dipilih`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {bulkMode ? (
              <>
                <button
                  onClick={bulkDeleteChapters}
                  disabled={selectedChapters.size === 0}
                  className="px-3 py-2 bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Hapus ({selectedChapters.size})
                </button>
                <button
                  onClick={() => {
                    setBulkMode(false);
                    setSelectedChapters(new Set());
                  }}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
                >
                  <FiXIcon size={14} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setBulkMode(true)}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
                  title="Pilih banyak"
                >
                  <FiCheckIcon size={14} />
                </button>
                <button
                  onClick={() => {
                    setChapterForm({ image_urls: [] });
                    setView("chapterForm");
                  }}
                  className="px-3 py-2 bg-[#7c5cfc] hover:bg-[#6b4ae6] rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1"
                >
                  <FiPlusIcon /> <span className="hidden sm:inline">Tambah</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <FiSearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
          <input
            value={chapterSearch}
            onChange={(e) => setChapterSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#7c5cfc]/50 transition-colors"
            placeholder="Cari chapter..."
          />
        </div>

        {/* Chapter List */}
        <div className="bg-[#13131a] border border-white/[.06] rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-white/30 text-sm">Memuat chapter...</div>
          ) : filteredChapters.length === 0 ? (
            <div className="p-8 text-center text-white/30 text-sm">
              {chapterSearch ? "Chapter tidak ditemukan" : "Belum ada chapter."}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredChapters.map((chap) => (
                <div key={chap.id} className="p-3 sm:p-4 flex items-center gap-3 hover:bg-white/[.02] transition-colors">
                  {bulkMode && (
                    <button
                      onClick={() => toggleChapterSelect(chap.id)}
                      className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                        selectedChapters.has(chap.id)
                          ? "bg-[#7c5cfc] border-[#7c5cfc]"
                          : "border-white/20"
                      }`}
                    >
                      {selectedChapters.has(chap.id) && <FiCheckIcon size={10} className="text-white" />}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">Chapter {chap.chapter_number}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">
                      {chap.image_urls.length} gambar{chap.title ? ` • ${chap.title}` : ""}
                    </p>
                  </div>
                  {!bulkMode && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setChapterForm(chap);
                          setView("chapterForm");
                        }}
                        className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20"
                      >
                        <FiEdit2Icon size={14} />
                      </button>
                      <button
                        onClick={() => deleteChapter(chap.id)}
                        className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center hover:bg-rose-500/20"
                      >
                        <FiTrash2Icon size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── CHAPTER FORM VIEW ──────────────────────────────────────
  if (view === "chapterForm") {
    return (
      <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-4">
        <button
          onClick={() => setView("chapterList")}
          className="flex items-center gap-2 text-white/50 hover:text-white mb-4 text-sm"
        >
          <FiChevronLeftIcon /> Batal
        </button>

        <h2 className="text-lg font-bold mb-4 text-emerald-400 flex items-center gap-2">
          {chapterForm.id ? "Edit Chapter" : "Upload Chapter Baru"}
        </h2>

        <form onSubmit={saveChapter} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Nomor Chapter</label>
              <input
                required
                type="number"
                step="0.1"
                value={chapterForm.chapter_number || ""}
                onChange={(e) => setChapterForm({ ...chapterForm, chapter_number: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
                placeholder="12"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Judul (Opsional)</label>
              <input
                value={chapterForm.title || ""}
                onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
                placeholder="Awal Baru"
              />
            </div>
          </div>

          <div className="border border-white/10 rounded-xl p-4 bg-white/[.02]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-sm">Gambar Chapter</p>
                <p className="text-[10px] text-white/40 mt-1">Upload file berurutan. Diurutkan otomatis.</p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !chapterForm.chapter_number}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {uploading ? `${uploadProgress}%` : <><FiUploadCloudIcon /> Pilih</>}
              </button>
              <input type="file" multiple accept="image/jpeg,image/png,image/webp" ref={fileInputRef} className="hidden" onChange={uploadChapterImages} />
            </div>

            {uploading && (
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-4">
                <div
                  className="bg-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {chapterForm.image_urls?.map((url, i) => (
                <div key={i} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-white/10 group bg-black/50">
                  <img src={url} alt={`Page ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <button
                      type="button"
                      onClick={() => {
                        const urls = [...(chapterForm.image_urls || [])];
                        urls.splice(i, 1);
                        setChapterForm({ ...chapterForm, image_urls: urls });
                      }}
                      className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white"
                    >
                      <FiTrash2Icon size={14} />
                    </button>
                  </div>
                  <div className="absolute top-1 left-1 bg-black/80 px-1.5 rounded text-[8px] font-bold">
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
            {chapterForm.image_urls?.length === 0 && !uploading && (
              <div className="py-8 text-center text-white/20 text-xs border border-dashed border-white/10 rounded-xl flex flex-col items-center">
                <FiImageIcon size={24} className="mb-2 opacity-50" />
                Belum ada gambar
              </div>
            )}
          </div>

          <button
            disabled={loading || uploading}
            type="submit"
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 text-white"
          >
            <FiSaveIcon /> Simpan Chapter
          </button>
        </form>
      </div>
    );
  }

  // ─── MANGA LIST VIEW (Default) ──────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
            <FiBookOpenIcon className="text-emerald-400" /> Project
          </h2>
          <p className="text-[11px] text-white/40 mt-1">
            {mangaList.length} manga{bulkMode && selectedManga.size > 0 ? ` • ${selectedManga.size} dipilih` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {bulkMode ? (
            <>
              <button
                onClick={bulkDeleteManga}
                disabled={selectedManga.size === 0}
                className="px-3 py-2 bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Hapus ({selectedManga.size})
              </button>
              <button
                onClick={() => {
                  setBulkMode(false);
                  setSelectedManga(new Set());
                }}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
              >
                <FiXIcon size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setBulkMode(true)}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
                title="Pilih banyak"
              >
                <FiCheckIcon size={14} />
              </button>
              <button
                onClick={() => {
                  setMangaForm({});
                  setView("mangaForm");
                }}
                className="px-3 py-2 bg-[#7c5cfc] hover:bg-[#6b4ae6] rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1"
              >
                <FiPlusIcon /> <span className="hidden sm:inline">Tambah</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <FiSearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
        <input
          value={mangaSearch}
          onChange={(e) => setMangaSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#7c5cfc]/50 transition-colors"
          placeholder="Cari manga..."
        />
      </div>

      {/* Manga Grid */}
      {loading && mangaList.length === 0 ? (
        <div className="p-8 text-center text-white/30 text-sm">Memuat data...</div>
      ) : filteredManga.length === 0 ? (
        <div className="bg-[#13131a] border border-white/[.06] rounded-2xl p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-white/20">
            <FiBookOpenIcon size={24} />
          </div>
          <p className="text-white/40 mb-1">{mangaSearch ? "Manga tidak ditemukan" : "Belum ada project"}</p>
          {!mangaSearch && <p className="text-xs text-white/30">Klik tombol Tambah untuk memulai</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3">
          {filteredManga.map((manga) => (
            <div key={manga.id} className="bg-[#13131a] border border-white/[.06] rounded-xl overflow-hidden group">
              <div className="aspect-[3/4] relative cursor-pointer" onClick={() => !bulkMode && openChapters(manga)}>
                {manga.cover_url ? (
                  <img src={manga.cover_url} alt={manga.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/10">
                    <FiImageIcon size={32} />
                  </div>
                )}
                {bulkMode && (
                  <div className="absolute top-2 left-2 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMangaSelect(manga.id);
                      }}
                      className={`w-6 h-6 rounded-md border flex items-center justify-center ${
                        selectedManga.has(manga.id)
                          ? "bg-[#7c5cfc] border-[#7c5cfc]"
                          : "bg-black/50 border-white/30"
                      }`}
                    >
                      {selectedManga.has(manga.id) && <FiCheckIcon size={12} className="text-white" />}
                    </button>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 flex flex-col justify-end p-3">
                  <h3 className="font-bold text-xs sm:text-sm leading-tight text-white line-clamp-2">{manga.title}</h3>
                  <p className="text-[10px] text-white/70 mt-1 capitalize">
                    {manga.type} • {manga.status}
                  </p>
                </div>
              </div>
              {!bulkMode && (
                <div className="p-2 flex items-center gap-2 bg-[#0f0f14]">
                  <button
                    onClick={() => openChapters(manga)}
                    className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] sm:text-xs font-medium text-emerald-400"
                  >
                    Kelola Chapter
                  </button>
                  <button
                    onClick={() => {
                      setMangaForm(manga);
                      setView("mangaForm");
                    }}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
                  >
                    <FiEdit2Icon size={12} />
                  </button>
                  <button
                    onClick={() => deleteManga(manga.id)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 hover:bg-rose-500/20"
                  >
                    <FiTrash2Icon size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
