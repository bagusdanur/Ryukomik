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
  FiEye as FiEyeIcon,
  FiDownloadCloud as FiDownloadCloudIcon,
} from "react-icons/fi";
import { MANGA_SOURCES } from "@/config/sources";

function parseSourceInput(
  raw: string,
  fallbackSource: string,
  mode: "detail" | "chapter"
): { source: string; slug: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const parts = url.pathname.split("/").filter(Boolean);
      const prefix = mode === "detail" ? "komik" : "chapter";
      if (parts[0] === prefix && parts.length >= 3) {
        return { source: parts[1], slug: parts.slice(2).join("/") };
      }
    } catch {
      // Bukan URL valid — perlakukan sebagai slug mentah di bawah
    }
  }

  return { source: fallbackSource, slug: trimmed.replace(/^\/+|\/+$/g, "") };
}

type SourceSearchItem = { slug: string; title: string; image?: string };
type SourceChapterItem = { slug: string; label: string };
type AutoImportCandidate = { number: number; slug: string; label: string };
type AutoImportDiff = { missing: AutoImportCandidate[]; existingCount: number; unparsedCount: number };
type AutoImportProgress = { done: number; total: number; success: number; failed: number; currentLabel: string };

function extractChapterNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const match = String(raw ?? "").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return Number.isFinite(num) ? num : null;
}

function extractSourceItemSlug(item: Record<string, unknown>): string {
  if (item.slug) return String(item.slug);
  const link = String(item.detail_link || item.link || "");
  const parts = link.split("/").filter(Boolean);
  return parts.at(-1) || parts.at(-2) || "";
}

function normalizeSourceSearchItems(items: unknown, sourceId: string): SourceSearchItem[] {
  if (!Array.isArray(items)) return [];
  const prefix = `${sourceId}-`;
  return items
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => {
      let slug = extractSourceItemSlug(item);
      if (slug.startsWith(prefix)) slug = slug.slice(prefix.length);
      return {
        slug,
        title: String(item.title || slug),
        image: item.image ? String(item.image) : undefined,
      };
    })
    .filter((item) => item.slug);
}

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
  is_published: boolean;
  is_spotlight?: boolean;
  view_count?: number;
  created_at: string;
};

type Chapter = {
  id: string;
  manga_slug: string;
  chapter_number: number;
  title?: string;
  image_urls: string[];
  uploaded_at: string;
  is_published: boolean;
};

type MangaConfirmation = {
  action: "publish" | "draft" | "delete";
  manga: Manga;
};

type ProjectViewStats = {
  readersToday: number;
  readers7d: number;
  bySlug: Record<string, number>;
};

interface ProjectTabProps {
  getAdminToken: () => Promise<string>;
}

export default function ProjectTab({ getAdminToken }: ProjectTabProps) {
  const [view, setView] = useState<"mangaList" | "mangaForm" | "chapterList" | "chapterForm" | "chapterPreview">("mangaList");

  // Data
  const [mangaList, setMangaList] = useState<Manga[]>([]);
  const [activeManga, setActiveManga] = useState<Manga | null>(null);
  const [chapterList, setChapterList] = useState<Chapter[]>([]);
  const [viewStats, setViewStats] = useState<ProjectViewStats>({
    readersToday: 0,
    readers7d: 0,
    bySlug: {},
  });

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Forms
  const [mangaForm, setMangaForm] = useState<Partial<Manga>>({ is_published: false });
  const [chapterForm, setChapterForm] = useState<Partial<Chapter>>({ is_published: false });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStats, setUploadStats] = useState<{ success: number; failed: number } | null>(null);

  // Import dari source
  const [importCoverSource, setImportCoverSource] = useState(MANGA_SOURCES[0]?.id || "komiku");
  const [importCoverSlug, setImportCoverSlug] = useState("");
  const [importingCover, setImportingCover] = useState(false);
  const [importChapterSource, setImportChapterSource] = useState(MANGA_SOURCES[0]?.id || "komiku");
  const [importChapterSlug, setImportChapterSlug] = useState("");
  const [importingChapterImages, setImportingChapterImages] = useState(false);

  // Search dropdown untuk import cover
  const [coverSearchFocused, setCoverSearchFocused] = useState(false);
  const [coverSearchResults, setCoverSearchResults] = useState<SourceSearchItem[]>([]);
  const [coverSearchLoading, setCoverSearchLoading] = useState(false);

  // Search dropdown + pemilihan chapter untuk import gambar chapter
  const [chapterSearchFocused, setChapterSearchFocused] = useState(false);
  const [chapterSearchResults, setChapterSearchResults] = useState<SourceSearchItem[]>([]);
  const [chapterSearchLoading, setChapterSearchLoading] = useState(false);
  const [chapterPickerManga, setChapterPickerManga] = useState<{ slug: string; title: string } | null>(null);
  const [chapterPickerList, setChapterPickerList] = useState<SourceChapterItem[]>([]);
  const [chapterPickerLoading, setChapterPickerLoading] = useState(false);

  // Auto-import sisa chapter dari source (bulk, dari Chapter List view)
  const [autoImportOpen, setAutoImportOpen] = useState(false);
  const [autoImportSource, setAutoImportSource] = useState(MANGA_SOURCES[0]?.id || "komiku");
  const [autoImportSlug, setAutoImportSlug] = useState("");
  const [autoImportSearchFocused, setAutoImportSearchFocused] = useState(false);
  const [autoImportSearchResults, setAutoImportSearchResults] = useState<SourceSearchItem[]>([]);
  const [autoImportSearchLoading, setAutoImportSearchLoading] = useState(false);
  const [autoImportManga, setAutoImportManga] = useState<{ slug: string; title: string } | null>(null);
  const [autoImportComparing, setAutoImportComparing] = useState(false);
  const [autoImportDiff, setAutoImportDiff] = useState<AutoImportDiff | null>(null);
  const [autoImportRunning, setAutoImportRunning] = useState(false);
  const [autoImportProgress, setAutoImportProgress] = useState<AutoImportProgress | null>(null);
  const [autoImportSummary, setAutoImportSummary] = useState<{ success: number; failed: number } | null>(null);
  const autoImportAbortRef = useRef(false);

  // Drag and drop
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Search
  const [chapterSearch, setChapterSearch] = useState("");
  const [mangaSearch, setMangaSearch] = useState("");

  // Bulk delete
  const [selectedManga, setSelectedManga] = useState<Set<string>>(new Set());
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [mangaConfirmation, setMangaConfirmation] = useState<MangaConfirmation | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // â”€â”€â”€ FILTERED DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  const publicationSummary = useMemo(() => ({
    published: mangaList.filter((manga) => manga.is_published).length,
    drafts: mangaList.filter((manga) => !manga.is_published).length,
  }), [mangaList]);

  const totalViews = useMemo(
    () => mangaList.reduce((total, manga) => total + (Number(manga.view_count) || 0), 0),
    [mangaList],
  );

  // â”€â”€â”€ SEARCH DARI SOURCE (autocomplete pengganti input slug manual) â”€â”€â”€
  useEffect(() => {
    const query = importCoverSlug.trim();
    if (!coverSearchFocused || query.length < 2 || /^https?:\/\//i.test(query)) {
      setCoverSearchResults([]);
      setCoverSearchLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCoverSearchLoading(true);
      try {
        const apiSource = importCoverSource === "kiryuu" ? "komikid" : importCoverSource;
        const res = await fetch(`https://api.ryukomik.web.id/${apiSource}/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        const items = Array.isArray(json) ? json : json?.data;
        setCoverSearchResults(normalizeSourceSearchItems(items, importCoverSource));
      } catch {
        if (!controller.signal.aborted) setCoverSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setCoverSearchLoading(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [importCoverSlug, importCoverSource, coverSearchFocused]);

  useEffect(() => {
    const query = importChapterSlug.trim();
    if (!chapterSearchFocused || chapterPickerManga || query.length < 2 || /^https?:\/\//i.test(query)) {
      setChapterSearchResults([]);
      setChapterSearchLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setChapterSearchLoading(true);
      try {
        const apiSource = importChapterSource === "kiryuu" ? "komikid" : importChapterSource;
        const res = await fetch(`https://api.ryukomik.web.id/${apiSource}/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        const items = Array.isArray(json) ? json : json?.data;
        setChapterSearchResults(normalizeSourceSearchItems(items, importChapterSource));
      } catch {
        if (!controller.signal.aborted) setChapterSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setChapterSearchLoading(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [importChapterSlug, importChapterSource, chapterSearchFocused, chapterPickerManga]);

  useEffect(() => {
    const query = autoImportSlug.trim();
    if (!autoImportSearchFocused || autoImportManga || query.length < 2 || /^https?:\/\//i.test(query)) {
      setAutoImportSearchResults([]);
      setAutoImportSearchLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setAutoImportSearchLoading(true);
      try {
        const apiSource = autoImportSource === "kiryuu" ? "komikid" : autoImportSource;
        const res = await fetch(`https://api.ryukomik.web.id/${apiSource}/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        const items = Array.isArray(json) ? json : json?.data;
        setAutoImportSearchResults(normalizeSourceSearchItems(items, autoImportSource));
      } catch {
        if (!controller.signal.aborted) setAutoImportSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setAutoImportSearchLoading(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [autoImportSlug, autoImportSource, autoImportSearchFocused, autoImportManga]);

  const pickAutoImportManga = async (item: SourceSearchItem) => {
    setAutoImportSearchResults([]);
    setAutoImportSearchFocused(false);
    setAutoImportManga({ slug: item.slug, title: item.title });
    setAutoImportDiff(null);
    setAutoImportSummary(null);
    setAutoImportComparing(true);
    try {
      const apiSource = autoImportSource === "kiryuu" ? "komikid" : autoImportSource;
      const res = await fetch(`https://api.ryukomik.web.id/${apiSource}/detail/${encodeURIComponent(item.slug)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const detail = json?.data ?? (json?.success ? json : null);
      const chapters = Array.isArray(detail?.chapters) ? detail.chapters : [];

      const existingNumbers = new Set(chapterList.map((c) => c.chapter_number));
      const seen = new Set<number>();
      const missing: AutoImportCandidate[] = [];
      let unparsedCount = 0;

      for (const raw of chapters as Record<string, unknown>[]) {
        const slug = String(raw.slug || "");
        if (!slug) continue;
        const number = extractChapterNumber(raw.chapter_number ?? raw.chapter ?? raw.title ?? slug);
        if (number === null) {
          unparsedCount += 1;
          continue;
        }
        if (seen.has(number)) continue; // source kadang punya entry duplikat
        seen.add(number);
        if (existingNumbers.has(number)) continue;
        const label = raw.chapter_number
          ? `Chapter ${raw.chapter_number}`
          : String(raw.chapter || raw.title || slug);
        missing.push({ number, slug, label });
      }

      missing.sort((a, b) => a.number - b.number);
      setAutoImportDiff({ missing, existingCount: chapterList.length, unparsedCount });
      if (chapters.length === 0) alert("Manga ini belum punya chapter di source.");
    } catch (err: any) {
      alert(`Gagal ambil daftar chapter: ${err.message || "Terjadi kesalahan"}`);
      setAutoImportManga(null);
    } finally {
      setAutoImportComparing(false);
    }
  };

  const closeAutoImport = () => {
    if (autoImportRunning) return;
    setAutoImportOpen(false);
    setAutoImportManga(null);
    setAutoImportDiff(null);
    setAutoImportSlug("");
    setAutoImportSummary(null);
    setAutoImportProgress(null);
  };

  const resetAutoImportTarget = () => {
    setAutoImportManga(null);
    setAutoImportDiff(null);
    setAutoImportSummary(null);
    setAutoImportSlug("");
  };

  const stopAutoImport = () => {
    autoImportAbortRef.current = true;
  };

  const runAutoImport = async () => {
    if (!activeManga || !autoImportDiff?.missing.length) return;
    const items = autoImportDiff.missing;
    const apiSource = autoImportSource === "kiryuu" ? "komikid" : autoImportSource;

    autoImportAbortRef.current = false;
    setAutoImportRunning(true);
    setAutoImportSummary(null);
    setAutoImportProgress({ done: 0, total: items.length, success: 0, failed: 0, currentLabel: items[0]?.label || "" });

    const token = await getAdminToken();
    let success = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i++) {
      if (autoImportAbortRef.current) break;
      const item = items[i];
      setAutoImportProgress({ done: i, total: items.length, success, failed, currentLabel: item.label });

      try {
        const chapRes = await fetch(`https://api.ryukomik.web.id/${apiSource}/chapter/${item.slug}`);
        if (!chapRes.ok) throw new Error(`HTTP ${chapRes.status}`);
        const chapJson = await chapRes.json();
        if (!chapJson?.success) throw new Error("Chapter tidak ditemukan di source");
        const images: string[] = Array.isArray(chapJson.images)
          ? chapJson.images.filter((u: unknown): u is string => typeof u === "string" && /^https?:\/\//.test(u))
          : [];
        if (images.length === 0) throw new Error("Tidak ada gambar ditemukan");

        const saveRes = await fetch("/api/admin/project/chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            manga_slug: activeManga.slug,
            chapter_number: item.number,
            image_urls: images,
            is_published: false,
          }),
        });
        if (!saveRes.ok) {
          const errJson = await saveRes.json().catch(() => ({}));
          throw new Error(errJson?.error || `HTTP ${saveRes.status}`);
        }
        success += 1;
      } catch (err) {
        failed += 1;
        console.error(`[auto-import] Gagal chapter ${item.number} (${item.slug})`, err);
      }

      setAutoImportProgress({ done: i + 1, total: items.length, success, failed, currentLabel: item.label });

      if (i < items.length - 1 && !autoImportAbortRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }

    setAutoImportSummary({ success, failed });
    setAutoImportRunning(false);
    await fetchChapters(activeManga.slug);
  };

  const bulkPublishChapters = async () => {
    if (selectedChapters.size === 0) return;
    if (!confirm(`Publish ${selectedChapters.size} chapter terpilih?`)) return;
    setLoading(true);
    try {
      const token = await getAdminToken();
      const targets = chapterList.filter((c) => selectedChapters.has(c.id));
      await Promise.all(
        targets.map((chap) =>
          fetch("/api/admin/project/chapter", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...chap, is_published: true }),
          })
        )
      );
      setSelectedChapters(new Set());
      setBulkMode(false);
      await fetchChapters(activeManga!.slug);
    } catch (err) {
      alert("Gagal publish chapter");
    } finally {
      setLoading(false);
    }
  };

  const pickChapterManga = async (item: SourceSearchItem) => {
    setChapterSearchResults([]);
    setChapterSearchFocused(false);
    setChapterPickerManga({ slug: item.slug, title: item.title });
    setChapterPickerList([]);
    setChapterPickerLoading(true);
    try {
      const apiSource = importChapterSource === "kiryuu" ? "komikid" : importChapterSource;
      const res = await fetch(`https://api.ryukomik.web.id/${apiSource}/detail/${encodeURIComponent(item.slug)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const detail = json?.data ?? (json?.success ? json : null);
      const chapters = Array.isArray(detail?.chapters) ? detail.chapters : [];
      const list: SourceChapterItem[] = chapters
        .map((c: Record<string, unknown>) => ({
          slug: String(c.slug || ""),
          label: c.chapter_number
            ? `Chapter ${c.chapter_number}`
            : String(c.chapter || c.title || c.slug || ""),
        }))
        .filter((c: SourceChapterItem) => c.slug);
      setChapterPickerList(list);
      if (list.length === 0) alert("Manga ini belum punya chapter di source.");
    } catch (err: any) {
      alert(`Gagal ambil daftar chapter: ${err.message || "Terjadi kesalahan"}`);
      setChapterPickerManga(null);
    } finally {
      setChapterPickerLoading(false);
    }
  };

  // â”€â”€â”€ MANGA ACTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchManga = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAdminToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [res, statsRes] = await Promise.all([
        fetch("/api/admin/project/manga", { headers }),
        fetch("/api/admin/project/view-stats", { headers }),
      ]);
      const [json, statsJson] = await Promise.all([res.json(), statsRes.json()]);
      setMangaList(json.data || []);
      if (statsRes.ok) {
        setViewStats({
          readersToday: Number(statsJson.readersToday) || 0,
          readers7d: Number(statsJson.readers7d) || 0,
          bySlug: statsJson.bySlug || {},
        });
      }
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
        `âš ï¸ HAPUS PERMANEN?\n\n"${title}"\n\nYang akan dihapus:\nâ€¢ Data manga dari database\nâ€¢ Semua chapter terkait\nâ€¢ Cover image dari R2 storage\nâ€¢ Semua gambar chapter dari R2\n\nTindakan ini TIDAK BISA dibatalkan!`
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

  const togglePublishManga = async (manga: Manga) => {
    const nextPublished = !manga.is_published;
    const action = nextPublished ? "mempublikasikan" : "menjadikan draft";
    if (!confirm(`Yakin ingin ${action} "${manga.title}"?`)) return;

    setLoading(true);
    try {
      const token = await getAdminToken();
      const res = await fetch("/api/admin/project/manga", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: manga.id, is_published: nextPublished }),
      });
      if (!res.ok) throw new Error("Gagal mengubah publikasi manga");
      await fetchManga();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah publikasi manga");
    } finally {
      setLoading(false);
    }
  };

  const toggleSpotlight = async (manga: Manga) => {
    setLoading(true);
    try {
      const token = await getAdminToken();
      const res = await fetch("/api/admin/project/manga", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: manga.id, is_spotlight: !manga.is_spotlight }),
      });
      if (!res.ok) throw new Error("Gagal mengubah spotlight");
      await fetchManga();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah spotlight");
    } finally {
      setLoading(false);
    }
  };

  const performDeleteManga = async (id: string) => {
    setLoading(true);
    try {
      const token = await getAdminToken();
      const res = await fetch(`/api/admin/project/manga?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal menghapus manga");
      await fetchManga();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus manga");
    } finally {
      setLoading(false);
    }
  };

  const performPublicationChange = async (manga: Manga) => {
    setLoading(true);
    try {
      const token = await getAdminToken();
      const res = await fetch("/api/admin/project/manga", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: manga.id, is_published: !manga.is_published }),
      });
      if (!res.ok) throw new Error("Gagal mengubah publikasi manga");
      await fetchManga();
    } catch (err: any) {
      alert(err.message || "Gagal mengubah publikasi manga");
    } finally {
      setLoading(false);
    }
  };

  const confirmMangaAction = async () => {
    if (!mangaConfirmation) return;
    const { action, manga } = mangaConfirmation;
    setMangaConfirmation(null);
    if (action === "delete") {
      await performDeleteManga(manga.id);
      return;
    }
    await performPublicationChange(manga);
  };

  const bulkDeleteManga = async () => {
    if (selectedManga.size === 0) return;
    if (
      !confirm(
        `âš ï¸ HAPUS ${selectedManga.size} MANGA?\n\nSemua manga terpilih, chapter, dan R2 files akan dihapus permanen!`
      )
    )
      return;
    setLoading(true);
    try {
      const token = await getAdminToken();
      await Promise.all(
        Array.from(selectedManga).map((id) =>
          fetch(`/api/admin/project/manga?id=${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
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
    if (!file.type.startsWith("image/")) {
      alert("File harus berupa gambar!");
      return;
    }

    setUploading(true);
    try {
      const token = await getAdminToken();

      // 1. Minta presigned URL dari server (hanya kirim metadata, bukan file)
      const presignRes = await fetch("/api/admin/project/presign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          mangaSlug: mangaForm.slug || "new-manga",
          type: "cover",
        }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        alert(`Gagal upload cover: ${presignData?.error || `HTTP ${presignRes.status}`}`);
        return;
      }

      // 2. Upload file langsung ke R2 dari browser (bypass Next.js â€” tidak ada 413)
      const uploadRes = await fetch(presignData.presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) {
        alert(`Gagal upload cover ke storage: HTTP ${uploadRes.status}`);
        return;
      }

      // 3. Set URL publik ke form
      setMangaForm({ ...mangaForm, cover_url: presignData.publicUrl });
    } catch (err: any) {
      alert(`Gagal upload cover: ${err.message || "Network error"}`);
    } finally {
      setUploading(false);
    }
  };

  const importCoverFromSource = async (directSlug?: string) => {
    const parsed = directSlug
      ? { source: importCoverSource, slug: directSlug }
      : parseSourceInput(importCoverSlug, importCoverSource, "detail");
    if (!parsed || !parsed.slug) {
      alert("Cari judul atau isi slug/link source dulu");
      return;
    }

    setImportingCover(true);
    try {
      const apiSource = parsed.source === "kiryuu" ? "komikid" : parsed.source;
      const res = await fetch(`https://api.ryukomik.web.id/${apiSource}/detail/${encodeURIComponent(parsed.slug)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const detail = json?.data ?? (json?.success ? json : null);
      const cover = detail?.thumbnail || detail?.image;
      if (!cover || typeof cover !== "string") throw new Error("Source tidak mengembalikan gambar cover");
      setMangaForm((prev) => ({ ...prev, cover_url: cover }));
    } catch (err: any) {
      alert(`Gagal import cover: ${err.message || "Terjadi kesalahan"}`);
    } finally {
      setImportingCover(false);
    }
  };

  const pickCoverResult = (item: SourceSearchItem) => {
    setCoverSearchResults([]);
    setCoverSearchFocused(false);
    setImportCoverSlug(item.slug);
    if (item.image) {
      setMangaForm((prev) => ({ ...prev, cover_url: item.image! }));
    } else {
      importCoverFromSource(item.slug);
    }
  };

  // â”€â”€â”€ CHAPTER ACTIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  const togglePublishChapter = async (chapter: Chapter) => {
    setLoading(true);
    try {
      const token = await getAdminToken();
      const res = await fetch("/api/admin/project/chapter", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...chapter, is_published: !chapter.is_published }),
      });
      if (!res.ok) throw new Error("Gagal mengubah status chapter");
      await fetchChapters(activeManga!.slug);
    } catch (err: any) {
      alert(err.message || "Gagal mengubah status chapter");
    } finally {
      setLoading(false);
    }
  };

  const deleteChapter = async (id: string) => {
    const chap = chapterList.find((c) => c.id === id);
    const label = chap ? `Chapter ${chap.chapter_number}` : "ini";
    if (
      !confirm(
        `âš ï¸ HAPUS PERMANEN?\n\n"${label}"\n\nYang akan dihapus:\nâ€¢ Data chapter dari database\nâ€¢ Semua gambar chapter dari R2 storage\n\nTindakan ini TIDAK BISA dibatalkan!`
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
        `âš ï¸ HAPUS ${selectedChapters.size} CHAPTER?\n\nSemua chapter terpilih dan gambar R2 akan dihapus permanen!`
      )
    )
      return;
    setLoading(true);
    try {
      const token = await getAdminToken();
      await Promise.all(
        Array.from(selectedChapters).map((id) =>
          fetch(`/api/admin/project/chapter?id=${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
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

    const files = Array.from(e.target.files).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );
    const invalid = files.filter((f) => !f.type.startsWith("image/"));
    if (invalid.length > 0) {
      alert(`File berikut bukan gambar:\n${invalid.map((f) => f.name).join("\n")}`);
      return;
    }

    const token = await getAdminToken();
    const urls: string[] = [];
    const failedFiles: string[] = [];
    let lastError = "";

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadStats(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          // 1. Minta presigned URL dari server (hanya metadata, bukan file body)
          const presignRes = await fetch("/api/admin/project/presign-upload", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type,
              mangaSlug: activeManga.slug,
              chapterNumber: String(chapterForm.chapter_number),
              type: "chapter",
            }),
          });

          const presignData = await presignRes.json();
          if (!presignRes.ok) {
            failedFiles.push(file.name);
            lastError = presignData?.error || `HTTP ${presignRes.status}`;
            console.error(`[upload] Gagal presign: ${file.name} â€” ${lastError}`);
            setUploadProgress(Math.round(((i + 1) / files.length) * 100));
            continue;
          }

          // 2. Upload langsung ke R2 dari browser (tidak melalui Next.js â€” tidak ada 413)
          const uploadRes = await fetch(presignData.presignedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!uploadRes.ok) {
            failedFiles.push(file.name);
            lastError = `Upload ke storage gagal: HTTP ${uploadRes.status}`;
            console.error(`[upload] R2 PUT gagal: ${file.name} â€” ${uploadRes.status}`);
          } else {
            // 3. Simpan URL publik
            urls.push(presignData.publicUrl);
          }
        } catch (fetchErr: any) {
          failedFiles.push(file.name);
          lastError = fetchErr.message || "Network error";
          console.error(`[upload] Network error: ${file.name}`, fetchErr);
        }

        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      // Tambahkan URL yang berhasil ke form
      if (urls.length > 0) {
        setChapterForm((prev) => ({
          ...prev,
          image_urls: [...(prev.image_urls || []), ...urls],
        }));
      }

      // Tampilkan ringkasan hasil upload
      setUploadStats({ success: urls.length, failed: failedFiles.length });
      if (failedFiles.length > 0) {
        setUploadError(
          `${failedFiles.length} gambar gagal diupload.\nError: ${lastError}\nFile: ${failedFiles.slice(0, 3).join(", ")}${failedFiles.length > 3 ? ` (+${failedFiles.length - 3} lainnya)` : ""}`
        );
      }
    } catch (err: any) {
      setUploadError(err.message || "Terjadi kesalahan saat upload");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const importChapterImagesFromSource = async (directSlug?: string) => {
    if (!chapterForm.chapter_number) {
      alert("Isi nomor chapter dulu sebelum import gambar!");
      return;
    }
    const parsed = directSlug
      ? { source: importChapterSource, slug: directSlug }
      : parseSourceInput(importChapterSlug, importChapterSource, "chapter");
    if (!parsed || !parsed.slug) {
      alert("Cari chapter atau isi slug/link source dulu");
      return;
    }

    setImportingChapterImages(true);
    try {
      const apiSource = parsed.source === "kiryuu" ? "komikid" : parsed.source;
      const res = await fetch(`https://api.ryukomik.web.id/${apiSource}/chapter/${parsed.slug}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json?.success) throw new Error("Chapter tidak ditemukan di source");
      const images: string[] = Array.isArray(json.images)
        ? json.images.filter((u: unknown): u is string => typeof u === "string" && /^https?:\/\//.test(u))
        : [];
      if (images.length === 0) throw new Error("Tidak ada gambar ditemukan di chapter ini");
      setChapterForm((prev) => ({ ...prev, image_urls: [...(prev.image_urls || []), ...images] }));
      setImportChapterSlug("");
      setChapterPickerManga(null);
      setChapterPickerList([]);
    } catch (err: any) {
      alert(`Gagal import gambar: ${err.message || "Terjadi kesalahan"}`);
    } finally {
      setImportingChapterImages(false);
    }
  };

  const pickChapterSlug = (slug: string) => {
    setImportChapterSlug(slug);
    importChapterImagesFromSource(slug);
  };

  // â”€â”€â”€ MANGA FORM VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (view === "mangaForm") {
    return (
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/[.07] bg-[#111116] shadow-2xl shadow-black/20">
        <div className="mb-0 flex items-center gap-3 border-b border-white/[.06] bg-gradient-to-r from-[#7c5cfc]/14 via-[#17151f] to-[#111116] px-4 py-5 sm:px-6 lg:px-8">
          <button
            onClick={() => setView("mangaList")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[.08] bg-white/[.05] text-white/60 transition hover:bg-white/[.1] hover:text-white"
          >
            <FiChevronLeftIcon />
          </button>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[.16em] text-[#b5a8ff]">Project editor</p>
            <h2 className="text-xl font-black tracking-tight sm:text-2xl">
              {mangaForm.id ? "Edit Project Manga" : "Tambah Project Baru"}
            </h2>
            <p className="mt-1 text-xs text-white/45">
              {mangaForm.id ? "Perbarui informasi manga" : "Upload karya mandiri kamu ke Ryukomik"}
            </p>
          </div>
        </div>

        <form onSubmit={saveManga} className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:p-8">
          {/* Cover */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
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
              <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={uploadCover} />
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
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-3 space-y-2">
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block">
                Import Cover dari Source
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={importCoverSource}
                  onChange={(e) => setImportCoverSource(e.target.value)}
                  className="bg-[#13131a] border border-white/10 rounded-lg px-2 py-2.5 text-xs text-white outline-none focus:border-[#7c5cfc]/50 sm:w-24"
                >
                  {MANGA_SOURCES.map((s) => (
                    <option key={s.id} value={s.id}>{s.id}</option>
                  ))}
                </select>
                <div className="relative flex-1 min-w-0">
                  <input
                    value={importCoverSlug}
                    onChange={(e) => setImportCoverSlug(e.target.value)}
                    onFocus={() => setCoverSearchFocused(true)}
                    onBlur={() => setTimeout(() => setCoverSearchFocused(false), 150)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2.5 text-xs outline-none focus:border-[#7c5cfc]/50"
                    placeholder="Cari judul, atau tempel slug/link..."
                  />
                  {coverSearchFocused && (coverSearchLoading || coverSearchResults.length > 0) && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#17171f] shadow-xl shadow-black/40">
                      {coverSearchLoading && (
                        <div className="px-3 py-3 text-xs text-white/40 flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                          Mencari...
                        </div>
                      )}
                      {!coverSearchLoading && coverSearchResults.map((item) => (
                        <button
                          key={item.slug}
                          type="button"
                          onClick={() => pickCoverResult(item)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/[.06] transition-colors min-h-[44px]"
                        >
                          {item.image ? (
                            <img src={item.image} alt="" className="h-9 w-7 flex-shrink-0 rounded object-cover bg-white/10" />
                          ) : (
                            <div className="h-9 w-7 flex-shrink-0 rounded bg-white/10" />
                          )}
                          <span className="text-xs text-white/80 truncate">{item.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => importCoverFromSource()}
                disabled={importingCover || !importCoverSlug.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-white/[.06] px-3 py-2.5 text-xs font-bold text-white/80 transition hover:bg-white/[.1] disabled:opacity-50"
              >
                {importingCover ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <FiDownloadCloudIcon size={14} />
                )}
                {importingCover ? "Mengambil..." : "Ambil Cover"}
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-5 rounded-2xl border border-white/[.07] bg-white/[.025] p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between border-b border-white/[.06] pb-4">
              <div>
                <p className="text-sm font-bold">Informasi manga</p>
                <p className="mt-0.5 text-xs text-white/40">Data ini ditampilkan pada halaman detail karya.</p>
              </div>
              <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black tracking-wide ${mangaForm.is_published ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-200"}`}>
                {mangaForm.is_published ? "PUBLIK" : "DRAFT"}
              </span>
            </div>
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
                    <option value="18+">18+</option>
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
                    <option value="cancelled">Cancelled</option>
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

            <div className="flex items-center justify-end gap-3 border-t border-white/[.06] pt-5">
              <button type="button" onClick={() => setView("mangaList")} className="rounded-xl px-4 py-3 text-sm font-bold text-white/50 transition hover:bg-white/[.06] hover:text-white">Batal</button>
              <button
                disabled={loading}
                type="submit"
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#9b83fc] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#7c5cfc]/20 transition-all hover:from-[#6b4ae6] hover:to-[#8a72ec] disabled:opacity-50"
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

  // â”€â”€â”€ CHAPTER LIST VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
              {bulkMode && selectedChapters.size > 0 && ` â€¢ ${selectedChapters.size} dipilih`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {bulkMode ? (
              <>
                <button
                  onClick={bulkPublishChapters}
                  disabled={selectedChapters.size === 0}
                  className="px-3 py-2 bg-emerald-500/20 text-emerald-300 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Publish ({selectedChapters.size})
                </button>
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
                  onClick={() => setAutoImportOpen((v) => !v)}
                  className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1 ${autoImportOpen ? "bg-emerald-400/20 text-emerald-300" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
                  title="Auto-import sisa chapter dari source"
                >
                  <FiDownloadCloudIcon /> <span className="hidden sm:inline">Auto-Import</span>
                </button>
                <button
                  onClick={() => {
                    setChapterForm({ image_urls: [], is_published: false });
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

        {/* Panel Auto-Import Sisa Chapter dari Source */}
        {autoImportOpen && (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[.04] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-200">Auto-Import Sisa Chapter</p>
                <p className="text-[10px] text-white/40 mt-0.5">
                  Bandingkan chapter project ini dengan source, lalu import semua yang belum ada (masuk sebagai draft).
                </p>
              </div>
              <button
                onClick={closeAutoImport}
                disabled={autoImportRunning}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white disabled:opacity-30"
              >
                <FiXIcon size={14} />
              </button>
            </div>

            {!autoImportManga && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={autoImportSource}
                  onChange={(e) => setAutoImportSource(e.target.value)}
                  className="bg-[#13131a] border border-white/10 rounded-lg px-2 py-2.5 text-xs text-white outline-none focus:border-emerald-400/50 sm:w-24"
                >
                  {MANGA_SOURCES.map((s) => (
                    <option key={s.id} value={s.id}>{s.id}</option>
                  ))}
                </select>
                <div className="relative flex-1 min-w-0">
                  <input
                    value={autoImportSlug}
                    onChange={(e) => setAutoImportSlug(e.target.value)}
                    onFocus={() => setAutoImportSearchFocused(true)}
                    onBlur={() => setTimeout(() => setAutoImportSearchFocused(false), 150)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2.5 text-xs outline-none focus:border-emerald-400/50"
                    placeholder="Cari judul manga di source ini..."
                  />
                  {autoImportSearchFocused && (autoImportSearchLoading || autoImportSearchResults.length > 0) && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#17171f] shadow-xl shadow-black/40">
                      {autoImportSearchLoading && (
                        <div className="px-3 py-3 text-xs text-white/40 flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                          Mencari...
                        </div>
                      )}
                      {!autoImportSearchLoading && autoImportSearchResults.map((item) => (
                        <button
                          key={item.slug}
                          type="button"
                          onClick={() => pickAutoImportManga(item)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/[.06] transition-colors min-h-[44px]"
                        >
                          {item.image ? (
                            <img src={item.image} alt="" className="h-9 w-7 flex-shrink-0 rounded object-cover bg-white/10" />
                          ) : (
                            <div className="h-9 w-7 flex-shrink-0 rounded bg-white/10" />
                          )}
                          <span className="text-xs text-white/80 truncate">{item.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {autoImportManga && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs text-white/70">
                    <span className="text-white/40">Source: </span>{autoImportManga.title}
                  </p>
                  {!autoImportRunning && (
                    <button
                      onClick={resetAutoImportTarget}
                      className="flex-shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold text-white/40 hover:bg-white/[.06] hover:text-white/70"
                    >
                      Ganti
                    </button>
                  )}
                </div>

                {autoImportComparing && (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[.06] px-3 py-3">
                    <div className="w-5 h-5 flex-shrink-0 border-2 border-emerald-400/30 border-t-emerald-300 rounded-full animate-spin" />
                    <div>
                      <p className="text-xs font-bold text-emerald-200">Mengambil daftar chapter dari source...</p>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        Sedang jalan, bukan macet — untuk manga dengan banyak chapter ini bisa makan waktu beberapa detik.
                      </p>
                    </div>
                  </div>
                )}

                {autoImportDiff && !autoImportRunning && !autoImportSummary && (
                  <div className="space-y-3">
                    <p className="text-xs text-white/60">
                      <span className="font-bold text-emerald-300">{autoImportDiff.missing.length} chapter baru</span> ditemukan
                      {autoImportDiff.missing.length > 0 && (
                        <> (Chapter {autoImportDiff.missing[0].number}–{autoImportDiff.missing[autoImportDiff.missing.length - 1].number})</>
                      )}
                      {" "}&bull; {autoImportDiff.existingCount} sudah ada di project
                      {autoImportDiff.unparsedCount > 0 && <> &bull; {autoImportDiff.unparsedCount} tidak bisa diproses</>}
                    </p>
                    <button
                      onClick={runAutoImport}
                      disabled={autoImportDiff.missing.length === 0}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-emerald-300 disabled:opacity-40 disabled:hover:bg-emerald-400"
                    >
                      <FiDownloadCloudIcon size={14} />
                      {autoImportDiff.missing.length === 0 ? "Tidak ada chapter baru" : `Import ${autoImportDiff.missing.length} Chapter`}
                    </button>
                  </div>
                )}

                {autoImportProgress && (autoImportRunning || autoImportSummary) && (
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all"
                        style={{ width: `${autoImportProgress.total ? Math.round((autoImportProgress.done / autoImportProgress.total) * 100) : 0}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-white/50">
                      {autoImportProgress.done}/{autoImportProgress.total}
                      {" "}&bull; berhasil {autoImportProgress.success} &bull; gagal {autoImportProgress.failed}
                      {autoImportRunning && <> &bull; proses: {autoImportProgress.currentLabel}</>}
                    </p>
                    {autoImportRunning ? (
                      <button
                        onClick={stopAutoImport}
                        className="w-full rounded-xl bg-rose-500/20 px-4 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/30"
                      >
                        Stop
                      </button>
                    ) : (
                      autoImportSummary && (
                        <div className="space-y-2">
                          <p className="text-xs text-white/70">
                            Selesai &bull; <span className="text-emerald-300 font-bold">{autoImportSummary.success} berhasil</span>
                            {autoImportSummary.failed > 0 && <span className="text-rose-300 font-bold"> &bull; {autoImportSummary.failed} gagal</span>}
                            {" "}&mdash; masuk sebagai draft, review lalu publish lewat mode pilih.
                          </p>
                          <button
                            onClick={closeAutoImport}
                            className="w-full rounded-xl bg-white/[.06] px-4 py-2.5 text-xs font-bold text-white/80 hover:bg-white/[.1]"
                          >
                            Tutup
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">Chapter {chap.chapter_number}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${chap.is_published ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-200"}`}>
                        {chap.is_published ? "PUBLIK" : "DRAFT"}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/40 mt-0.5">
                      {chap.image_urls.length} gambar{chap.title ? ` â€¢ ${chap.title}` : ""}
                    </p>
                  </div>
                  {!bulkMode && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setChapterForm(chap); setView("chapterPreview"); }}
                        className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center hover:bg-sky-500/20"
                        title="Preview scroll"
                      >
                        <FiEyeIcon size={14} />
                      </button>
                      <button
                        onClick={() => togglePublishChapter(chap)}
                        className={`rounded-lg px-2.5 h-8 text-[10px] font-bold ${chap.is_published ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/10 text-emerald-300"}`}
                      >
                        {chap.is_published ? "Draft" : "Publish"}
                      </button>
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

  // â”€â”€â”€ CHAPTER FORM VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (view === "chapterPreview") {
    return (
      <div className="min-h-screen bg-black">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-black/90 px-3 py-3 backdrop-blur">
          <button onClick={() => setView("chapterList")} className="flex items-center gap-2 text-sm font-bold text-white/70 hover:text-white">
            <FiChevronLeftIcon /> Kembali
          </button>
          <div className="text-right">
            <p className="text-sm font-bold">Chapter {chapterForm.chapter_number}</p>
            <p className="text-[10px] text-amber-300">Preview draft - {chapterForm.image_urls?.length || 0} halaman</p>
          </div>
        </div>
        <div className="mx-auto max-w-4xl">
          {chapterForm.image_urls?.map((url, index) => (
            <img key={url + index} src={url} alt={`Halaman ${index + 1}`} className="block h-auto w-full" loading={index < 2 ? "eager" : "lazy"} />
          ))}
          {!chapterForm.image_urls?.length && <p className="p-12 text-center text-sm text-white/40">Belum ada gambar untuk dipreview.</p>}
        </div>
      </div>
    );
  }

  if (view === "chapterForm") {
    return (
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/[.07] bg-[#111116] shadow-2xl shadow-black/20">
        <div className="border-b border-white/[.06] bg-gradient-to-r from-emerald-500/[.12] via-[#15171a] to-[#111116] px-4 py-5 sm:px-6">
        <button
          onClick={() => setView("chapterList")}
          className="mb-4 flex items-center gap-2 text-sm font-bold text-white/50 transition hover:text-white"
        >
          <FiChevronLeftIcon /> Batal
        </button>

        <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-white">
          {chapterForm.id ? "Edit Chapter" : "Upload Chapter Baru"}
        </h2>
        <p className="mt-1 text-xs text-white/45">Tambahkan detail chapter, lalu unggah halaman secara berurutan.</p>
        </div>

        <form onSubmit={saveChapter} className="space-y-5 p-4 sm:p-6">
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

          <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/[.08] bg-white/[.025] p-4">
            <div>
              <p className="text-sm font-bold">Status publikasi</p>
              <p className="mt-1 text-[10px] text-white/40">Biarkan draft selama pengecekan scroll dan revisi.</p>
            </div>
            <input type="checkbox" checked={Boolean(chapterForm.is_published)} onChange={(e) => setChapterForm({ ...chapterForm, is_published: e.target.checked })} className="h-5 w-5 accent-emerald-500" />
          </label>

          <div className="rounded-2xl border border-white/[.08] bg-white/[.025] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-sm">Gambar Chapter</p>
                <p className="text-[10px] text-white/40 mt-1">Upload file berurutan. Diurutkan otomatis.</p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !chapterForm.chapter_number}
                className="flex items-center gap-2 rounded-xl bg-emerald-400/[.12] px-4 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-400/[.2] disabled:opacity-50"
              >
                {uploading ? `${uploadProgress}%` : <><FiUploadCloudIcon /> Pilih</>}
              </button>
              <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={uploadChapterImages} />
            </div>

            <div className="mb-4 rounded-xl border border-white/10 bg-white/[.03] p-3 space-y-2">
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block">
                Import Gambar dari Source
              </label>

              {chapterPickerManga ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs text-white/70">
                      <span className="text-white/40">Manga: </span>{chapterPickerManga.title}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setChapterPickerManga(null); setChapterPickerList([]); }}
                      className="flex-shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold text-white/40 hover:bg-white/[.06] hover:text-white/70"
                    >
                      Ganti
                    </button>
                  </div>
                  {chapterPickerLoading ? (
                    <div className="flex items-center gap-2 px-1 py-2 text-xs text-white/40">
                      <div className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                      Memuat daftar chapter...
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/5">
                      {chapterPickerList.map((c) => (
                        <button
                          key={c.slug}
                          type="button"
                          onClick={() => pickChapterSlug(c.slug)}
                          disabled={importingChapterImages}
                          className="flex w-full min-h-[44px] items-center justify-between px-3 py-2.5 text-left text-xs text-white/80 transition-colors hover:bg-white/[.06] disabled:opacity-50"
                        >
                          {c.label}
                          {importingChapterImages && importChapterSlug === c.slug ? (
                            <div className="w-3 h-3 flex-shrink-0 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <FiDownloadCloudIcon size={12} className="flex-shrink-0 opacity-40" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={importChapterSource}
                      onChange={(e) => setImportChapterSource(e.target.value)}
                      className="bg-[#13131a] border border-white/10 rounded-lg px-2 py-2.5 text-xs text-white outline-none focus:border-[#7c5cfc]/50 sm:w-24"
                    >
                      {MANGA_SOURCES.map((s) => (
                        <option key={s.id} value={s.id}>{s.id}</option>
                      ))}
                    </select>
                    <div className="relative flex-1 min-w-0">
                      <input
                        value={importChapterSlug}
                        onChange={(e) => setImportChapterSlug(e.target.value)}
                        onFocus={() => setChapterSearchFocused(true)}
                        onBlur={() => setTimeout(() => setChapterSearchFocused(false), 150)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2.5 text-xs outline-none focus:border-[#7c5cfc]/50"
                        placeholder="Cari judul, atau tempel link chapter..."
                      />
                      {chapterSearchFocused && (chapterSearchLoading || chapterSearchResults.length > 0) && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#17171f] shadow-xl shadow-black/40">
                          {chapterSearchLoading && (
                            <div className="px-3 py-3 text-xs text-white/40 flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                              Mencari...
                            </div>
                          )}
                          {!chapterSearchLoading && chapterSearchResults.map((item) => (
                            <button
                              key={item.slug}
                              type="button"
                              onClick={() => pickChapterManga(item)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/[.06] transition-colors min-h-[44px]"
                            >
                              {item.image ? (
                                <img src={item.image} alt="" className="h-9 w-7 flex-shrink-0 rounded object-cover bg-white/10" />
                              ) : (
                                <div className="h-9 w-7 flex-shrink-0 rounded bg-white/10" />
                              )}
                              <span className="text-xs text-white/80 truncate">{item.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => importChapterImagesFromSource()}
                      disabled={importingChapterImages || !importChapterSlug.trim() || !chapterForm.chapter_number}
                      className="flex items-center justify-center gap-2 rounded-lg bg-white/[.06] px-3 py-2.5 text-xs font-bold text-white/80 transition hover:bg-white/[.1] disabled:opacity-50 whitespace-nowrap"
                    >
                      {importingChapterImages ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <FiDownloadCloudIcon size={14} />
                      )}
                      {importingChapterImages ? "Mengambil..." : "Ambil"}
                    </button>
                  </div>
                  <p className="text-[10px] text-white/30">Cari judul untuk pilih chapter otomatis, atau tempel slug/link chapter langsung. Gambar hotlink dari source asli.</p>
                </>
              )}
            </div>

            {uploading && (
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-4">
                <div
                  className="bg-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {chapterForm.image_urls?.map((url, i) => {
                const filename = url.split('/').pop() || `Page ${i + 1}`;
                return (
                  <div 
                    key={i} 
                    className={`flex items-center justify-between bg-black/40 border ${dragOverIdx === i ? 'border-emerald-500 scale-[1.02]' : 'border-white/10'} rounded-lg p-2 group cursor-move transition-all duration-200`}
                    draggable
                    onDragStart={(e) => {
                      setDraggedIdx(i);
                      if (e.dataTransfer) {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", i.toString());
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverIdx(i);
                    }}
                    onDragLeave={() => {
                      if (dragOverIdx === i) setDragOverIdx(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedIdx !== null && draggedIdx !== i) {
                        const urls = [...(chapterForm.image_urls || [])];
                        const itemToMove = urls[draggedIdx];
                        urls.splice(draggedIdx, 1);
                        urls.splice(i, 0, itemToMove);
                        setChapterForm({ ...chapterForm, image_urls: urls });
                      }
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                    onDragEnd={() => {
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded">
                        {i + 1}
                      </span>
                      <span className="text-xs text-white/70 truncate" title={decodeURIComponent(filename)}>
                        {decodeURIComponent(filename)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 hover:bg-white/10 rounded text-[var(--accent-2)] opacity-50 hover:opacity-100 transition-opacity"
                        title="Preview"
                      >
                        <FiEyeIcon size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          const urls = [...(chapterForm.image_urls || [])];
                          urls.splice(i, 1);
                          setChapterForm({ ...chapterForm, image_urls: urls });
                        }}
                        className="p-1.5 hover:bg-rose-500/20 rounded text-rose-400 opacity-50 hover:opacity-100 transition-opacity"
                        title="Hapus"
                      >
                        <FiTrash2Icon size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {chapterForm.image_urls?.length === 0 && !uploading && (
              <div className="py-8 text-center text-white/20 text-xs border border-dashed border-white/10 rounded-xl flex flex-col items-center">
                <FiImageIcon size={24} className="mb-2 opacity-50" />
                Belum ada gambar
              </div>
            )}
          </div>

          {/* Upload result notice */}
          {uploadStats && !uploading && (
            <div className={`rounded-xl px-4 py-3 text-sm flex items-start gap-2 ${
              uploadStats.failed > 0
                ? "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            }`}>
              <span className="text-base leading-none mt-0.5">{uploadStats.failed > 0 ? "âš ï¸" : "âœ…"}</span>
              <div>
                <p className="font-semibold">
                  {uploadStats.success} gambar berhasil
                  {uploadStats.failed > 0 && `, ${uploadStats.failed} gagal`}
                </p>
                {uploadError && (
                  <p className="text-xs mt-1 opacity-80 whitespace-pre-line">{uploadError}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setUploadStats(null); setUploadError(null); }}
                className="ml-auto text-white/30 hover:text-white/60"
              >
                <FiXIcon size={14} />
              </button>
            </div>
          )}

          <div className="flex justify-end border-t border-white/[.06] pt-5">
            <button
              disabled={loading || uploading}
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              <FiSaveIcon /> Simpan Chapter
            </button>
          </div>
        </form>
      </div>
    );
  }

  // â”€â”€â”€ MANGA LIST VIEW (Default) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-emerald-400/10 bg-gradient-to-br from-emerald-500/[.11] via-[#13131a] to-[#13131a] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300/70">Content studio</p>
            <h2 className="flex items-center gap-2 text-xl font-black tracking-tight sm:text-2xl">
              <FiBookOpenIcon className="text-emerald-400" /> Project manga
            </h2>
            <p className="mt-1 text-xs text-white/45">Kelola judul, chapter, dan status publikasi dalam satu tempat.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl border border-sky-400/15 bg-sky-400/[.08] px-3 py-2 text-xs font-bold text-sky-200">{totalViews.toLocaleString("id-ID")} views</span>
            <span className="rounded-xl border border-violet-400/15 bg-violet-400/[.08] px-3 py-2 text-xs font-bold text-violet-200">{viewStats.readers7d.toLocaleString("id-ID")} pembaca / 7 hari</span>
            <span className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-bold text-white/65">{viewStats.readersToday.toLocaleString("id-ID")} hari ini</span>
            <span className="rounded-xl border border-emerald-400/15 bg-emerald-400/[.08] px-3 py-2 text-xs font-bold text-emerald-300">{publicationSummary.published} publik</span>
            <span className="rounded-xl border border-amber-300/15 bg-amber-300/[.08] px-3 py-2 text-xs font-bold text-amber-200">{publicationSummary.drafts} draft</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-white/[.06] bg-[#13131a]/80 p-3 sm:flex-row sm:items-center sm:p-4">
        <div className="relative flex-1">
          <FiSearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={15} />
          <input
            value={mangaSearch}
            onChange={(e) => setMangaSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-400/45 focus:bg-black/30"
            placeholder="Cari judul, slug, atau author..."
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-auto text-xs text-white/40 sm:mr-1">{filteredManga.length} dari {mangaList.length} manga</span>
          {bulkMode ? (
            <>
              <button onClick={bulkDeleteManga} disabled={selectedManga.size === 0} className="rounded-xl bg-rose-500/15 px-3 py-2.5 text-xs font-bold text-rose-400 transition hover:bg-rose-500/25 disabled:opacity-50">Hapus ({selectedManga.size})</button>
              <button onClick={() => { setBulkMode(false); setSelectedManga(new Set()); }} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[.06] text-white/50 hover:text-white"><FiXIcon size={15} /></button>
            </>
          ) : (
            <>
              <button onClick={() => setBulkMode(true)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[.08] bg-white/[.04] text-white/55 transition hover:bg-white/[.09] hover:text-white" title="Pilih banyak"><FiCheckIcon size={15} /></button>
              <button onClick={() => { setMangaForm({ is_published: false }); setView("mangaForm"); }} className="flex items-center gap-1.5 rounded-xl bg-[#7c5cfc] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#7c5cfc]/20 transition hover:bg-[#6b4ae6]"><FiPlusIcon size={15} /> Tambah manga</button>
            </>
          )}
        </div>
      </div>

      <div className="hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
            <FiBookOpenIcon className="text-emerald-400" /> Project
          </h2>
          <p className="text-[11px] text-white/40 mt-1">
            {mangaList.length} manga{bulkMode && selectedManga.size > 0 ? ` â€¢ ${selectedManga.size} dipilih` : ""}
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
                  setMangaForm({ is_published: false });
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {filteredManga.map((manga) => (
            <div key={manga.id} className="group overflow-hidden rounded-2xl border border-white/[.07] bg-[#13131a] shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-400/30 hover:shadow-xl hover:shadow-black/25">
              <div className="relative aspect-[4/5] cursor-pointer overflow-hidden" onClick={() => !bulkMode && openChapters(manga)}>
                {manga.cover_url ? (
                  <img src={manga.cover_url} alt={manga.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
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
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-[#0d0d12] via-[#0d0d12]/15 to-transparent p-3.5">
                  <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleSpotlight(manga); }}
                      className={`flex items-center justify-center rounded-full w-6 h-6 text-[11px] transition ${
                        manga.is_spotlight
                          ? "bg-yellow-500/90 text-black shadow-lg"
                          : "bg-black/50 text-white/40 hover:text-yellow-300"
                      }`}
                      title={manga.is_spotlight ? "Hapus dari spotlight" : "Jadikan spotlight"}
                    >
                      ★
                    </button>
                    <span className="flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-2 py-1 text-[9px] font-bold text-white/80">
                      <FiEyeIcon size={10} />
                      {(manga.view_count || 0).toLocaleString("id-ID")}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-[9px] font-black tracking-wide shadow-lg ${
                      manga.is_published
                        ? "bg-emerald-500/90 text-white"
                        : "bg-amber-400/90 text-black"
                    }`}>
                      {manga.is_published ? "PUBLIK" : "DRAFT"}
                    </span>
                  </div>
                  <h3 className="line-clamp-2 text-sm font-black leading-tight text-white sm:text-[15px]">{manga.title}</h3>
                  <p className="mt-1 text-[10px] font-medium text-white/65 capitalize">
                    {manga.type} • {manga.status}
                  </p>
                </div>
              </div>
              {!bulkMode && (
                <div className="grid grid-cols-2 gap-2 border-t border-white/[.05] bg-[#101015] p-2.5">
                  <button
                    onClick={() => openChapters(manga)}
                    className="rounded-xl bg-emerald-400/[.1] px-3 py-2.5 text-[11px] font-black text-emerald-300 transition hover:bg-emerald-400/[.18]"
                  >
                    Kelola chapter
                  </button>
                  <button
                    onClick={() => setMangaConfirmation({ action: manga.is_published ? "draft" : "publish", manga })}
                    className={`rounded-xl px-2 py-2.5 text-[11px] font-black transition ${
                      manga.is_published
                        ? "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                    }`}
                  >
                    {manga.is_published ? "Jadikan draft" : "Publikasikan"}
                  </button>
                  <button
                    onClick={() => {
                      setMangaForm(manga);
                      setView("mangaForm");
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[.07] bg-white/[.04] px-3 py-2.5 text-[11px] font-bold text-white/60 transition hover:bg-white/[.1] hover:text-white"
                  >
                    <FiEdit2Icon size={13} /> Edit
                  </button>
                  <button
                    onClick={() => setMangaConfirmation({ action: "delete", manga })}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-2.5 text-[11px] font-bold text-rose-300 transition hover:bg-rose-500/20"
                  >
                    <FiTrash2Icon size={13} /> Hapus
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {mangaConfirmation && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#16161d] shadow-2xl shadow-black/60">
            <div className={`h-1.5 ${mangaConfirmation.action === "delete" ? "bg-rose-500" : mangaConfirmation.action === "publish" ? "bg-emerald-400" : "bg-amber-400"}`} />
            <div className="p-5 sm:p-6">
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${mangaConfirmation.action === "delete" ? "bg-rose-500/12 text-rose-300" : mangaConfirmation.action === "publish" ? "bg-emerald-400/12 text-emerald-300" : "bg-amber-400/12 text-amber-200"}`}>
                {mangaConfirmation.action === "delete" ? <FiTrash2Icon size={19} /> : <FiCheckIcon size={20} />}
              </div>
              <p className="text-lg font-black tracking-tight">
                {mangaConfirmation.action === "delete"
                  ? "Hapus project ini?"
                  : mangaConfirmation.action === "publish"
                    ? "Publikasikan project?"
                    : "Jadikan project sebagai draft?"}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                <span className="font-bold text-white/85">{mangaConfirmation.manga.title}</span>{" "}
                {mangaConfirmation.action === "delete"
                  ? "beserta seluruh chapter dan gambar terkait akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
                  : mangaConfirmation.action === "publish"
                    ? "akan langsung tampil pada listing, pencarian, dan halaman publik Ryukomik."
                    : "tidak lagi tampil pada listing, pencarian, detail, maupun reader publik."}
              </p>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button onClick={() => setMangaConfirmation(null)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-white/55 transition hover:bg-white/[.06] hover:text-white">Batal</button>
                <button
                  onClick={confirmMangaAction}
                  className={`rounded-xl px-4 py-2.5 text-sm font-black text-white transition ${mangaConfirmation.action === "delete" ? "bg-rose-500 hover:bg-rose-400" : mangaConfirmation.action === "publish" ? "bg-emerald-500 hover:bg-emerald-400" : "bg-amber-400 text-black hover:bg-amber-300"}`}
                >
                  {mangaConfirmation.action === "delete" ? "Ya, hapus permanen" : mangaConfirmation.action === "publish" ? "Ya, publikasikan" : "Ya, jadikan draft"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
