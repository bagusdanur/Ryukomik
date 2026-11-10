"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FiAlertTriangle, FiArrowRight, FiBookOpen, FiClock, FiEdit3, FiEye, FiImage,
  FiChevronDown, FiChevronLeft, FiChevronRight, FiPlus, FiSave, FiSend, FiTrash2, FiUser, FiX,
} from "react-icons/fi";
import { getSession } from "@/lib/auth/getSession";
import { toWebp } from "@/utils/toWebp";
import { Button, Field, Panel, PanelHead, Row, Stat, StatusDot, Tabs, inputClass } from "@/components/scanlator/ui";

type Profile = {
  handle: string; team_name: string; bio: string | null; avatar_url?: string | null;
  support_dana: string | null; support_trakteer: string | null; support_tako: string | null; support_url_lain: string | null;
  contact_wa: string | null; contact_telegram: string | null; contact_discord: string | null;
  status: "active" | "suspended" | "revoked";
  warnings: number; suspended_until: string | null; moderation_note: string | null;
};

type Work = {
  slug: string; title: string; cover_url: string | null; type: string | null;
  review_status: string | null; review_note?: string | null; is_published: boolean; is_adult: boolean; chapters?: number;
};

type TabId = "ringkasan" | "upload" | "karya" | "profil";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "ringkasan", label: "Ringkasan" },
  { id: "karya", label: "Project" },
  { id: "profil", label: "Profil" },
];

export default function ScanlatorStudio() {
  const [tab, setTab] = useState<TabId>("ringkasan");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [needLogin, setNeedLogin] = useState(false);
  const [notScanlator, setNotScanlator] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [quota, setQuota] = useState<{ usedLabel: string; limitLabel: string; percent: number; fileCount: number } | null>(null);
  const [stats, setStats] = useState<{ totalViews: number; totalChapters: number; projects: Array<{ slug: string; title: string; views: number }> } | null>(null);

  const [teamName, setTeamName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [bio, setBio] = useState("");
  const [dana, setDana] = useState("");
  const [trakteer, setTrakteer] = useState("");
  const [tako, setTako] = useState("");
  const [lain, setLain] = useState("");
  const [cDc, setCDc] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Manhwa");
  const [genres, setGenres] = useState("");
  const [isAdult, setIsAdult] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [busySeries, setBusySeries] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [chapterSlug, setChapterSlug] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterImages, setChapterImages] = useState<string[]>([]);
  const [uploadingChapter, setUploadingChapter] = useState(false);
  const [progress, setProgress] = useState<{
    total: number; done: number; failed: Array<{ name: string; reason: string }>;
    failedFiles: File[];
    currentName: string; savedBytes: number; startedAt: number;
  } | null>(null);
  const [busyChapter, setBusyChapter] = useState(false);
  const [mode, setMode] = useState<"seri" | "chapter">("seri");

  // Kelola project (Tahap 2): buka detail, edit, hapus
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [chapters, setChapters] = useState<Array<{ id: string; chapter_number: number; title: string | null; is_published: boolean; pages: number }>>([]);
  const [chapterViews, setChapterViews] = useState<Record<number, number>>({});
  const [cleaning, setCleaning] = useState(false);
  const [chapterBytes, setChapterBytes] = useState(0);
  const [topChapter, setTopChapter] = useState<{ chapter_number: number; views: number } | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editType, setEditType] = useState("Manhwa");
  const [editGenres, setEditGenres] = useState("");
  const [editAdult, setEditAdult] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [chapterDraft, setChapterDraft] = useState<Record<string, string>>({});
  const [projectTab, setProjectTab] = useState<"detail" | "chapter">("detail");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editChapter, setEditChapter] = useState<{ id: string; number: number; titles: string; images: string[] } | null>(null);
  const [previewChapter, setPreviewChapter] = useState<{ number: number; title: string | null; images: string[] } | null>(null);
  const [savingPages, setSavingPages] = useState(false);
  const [historyChapter, setHistoryChapter] = useState<{ number: number; items: Array<{ id: string; action: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null; created_at: string }> } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Kunci scroll halaman di belakang saat modal terbuka.
  useEffect(() => {
    const open = Boolean(editChapter || previewChapter || historyChapter);
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [editChapter, previewChapter, historyChapter]);

  const token = async () => (await getSession()).data.session?.access_token || "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = await token();
      if (!t) { setNeedLogin(true); return; }
      const [pRes, wRes] = await Promise.all([
        fetch("/api/scanlator/profile", { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" }),
        fetch("/api/scanlator/series", { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" }),
      ]);
      if (pRes.status === 403) { setNotScanlator(true); setProfile(null); setWorks([]); return; }
      if (pRes.ok) {
        const json = (await pRes.json()) as { profile?: Profile | null };
        if (!json.profile) {
          // User dihapus/dicabut admin: jangan biarkan sisa data lama tampil.
          setProfile(null);
          setWorks([]);
          setChapters([]);
          setStats(null);
          setQuota(null);
          setNotScanlator(true);
          return;
        }
        if (json.profile) {
          const p = json.profile;
          setProfile(p);
          setTeamName(p.team_name || "");
          setAvatarUrl(p.avatar_url || "");
          setBio(p.bio || "");
          setDana(p.support_dana || "");
          setTrakteer(p.support_trakteer || "");
          setTako(p.support_tako || "");
          setLain(p.support_url_lain || "");
          setCDc(p.contact_discord || "");
        }
      }
      if (wRes.ok) setWorks(((await wRes.json()) as { works?: Work[] }).works || []);
      const sRes = await fetch("/api/scanlator/stats", { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" }).catch(() => null);
      if (sRes?.ok) setStats((await sRes.json()) as { totalViews: number; totalChapters: number; projects: Array<{ slug: string; title: string; views: number }> });
      const qRes = await fetch("/api/scanlator/quota", { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" }).catch(() => null);
      if (qRes?.ok) {
        const qj = (await qRes.json()) as { usedLabel: string; limitLabel: string; percent: number; fileCount: number };
        setQuota(qj);
      }

    } catch {
      setError("Gagal memuat studio.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true); setError(""); setNotice("");
    try {
      const t = await token();
      const res = await fetch("/api/scanlator/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          team_name: teamName, bio, avatar_url: avatarUrl,
          support_dana: dana, support_trakteer: trakteer, support_tako: tako, support_url_lain: lain,
          contact_discord: cDc,
        }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Gagal menyimpan."); return; }
      setNotice("Perubahan tersimpan.");
      await load();
    } finally { setSavingProfile(false); }
  };

  /**
   * Upload seperti dashboard Project: minta presigned URL, unggah langsung ke
   * R2 dari browser. Kalau R2 menolak (CORS), baru lewat server sebagai cadangan.
   */
  const uploadImage = async (
    rawFile: File,
    kind: "cover" | "chapter" | "avatar",
    slug: string,
    onPrepared?: (savedBytes: number) => void,
  ) => {
    const t = await token();
    // WebP kualitas 95 tanpa ubah dimensi (mengikuti converter RyukomikBot).
    const webp = await toWebp(rawFile);
    const file = webp.file;
    if (webp.converted) onPrepared?.(webp.originalBytes - webp.bytes);

    // Watermark tidak lagi ditambahkan sistem — tim Scanlator mengedit
    // watermark mereka sendiri. Semua gambar lewat presigned URL.
    try {
      const presignRes = await fetch("/api/scanlator/presign-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type || "image/webp", slug, kind, size: file.size }),
      });
      const presign = (await presignRes.json().catch(() => null)) as
        | { presignedUrl?: string; publicUrl?: string; key?: string; error?: string }
        | null;
      if (!presignRes.ok) throw new Error(presign?.error || `Gagal menyiapkan upload (${presignRes.status}).`);

      if (presign?.presignedUrl && presign.publicUrl) {
        // Koneksi mobile bisa terputus di tengah — coba beberapa kali sebelum
        // menyerah dan turun ke jalur server.
        let put: Response | null = null;
        for (let attempt = 0; attempt < 3 && !(put && put.ok); attempt += 1) {
          put = await fetch(presign.presignedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type || "image/webp" },
            body: file,
          }).catch(() => null);
          if ((!put || !put.ok) && attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
          }
        }
        if (put?.ok) {
          // Lepas slot reservasi kuota (kalau gagal, slot kedaluwarsa sendiri 30 menit).
          void fetch("/api/scanlator/upload-commit", {
            method: "POST",
            headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
            body: JSON.stringify({ key: presign.key }),
          }).catch(() => undefined);
          return presign.publicUrl;
        }
      }
    } catch (err) {
      // Lanjut ke jalur server di bawah.
      if (err instanceof Error && /Kuota storage habis/i.test(err.message)) throw err;
    }

    // Jalur cadangan: unggah lewat server. Dicoba 2x karena "Failed to fetch"
    // biasanya koneksi terputus, bukan file yang bermasalah.
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("kind", kind);
        fd.append("slug", slug);
        const res = await fetch("/api/scanlator/upload-image", { method: "POST", headers: { Authorization: `Bearer ${t}` }, body: fd });
        const json = (await res.json().catch(() => null)) as { success?: boolean; url?: string; error?: string } | null;
        if (!res.ok || !json?.success || !json.url) throw new Error(json?.error || "Upload gagal.");
        return json.url;
      } catch (err) {
        lastError = err;
        if (attempt < 1) await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Upload gagal.");
  };

  const cleanupStorage = async () => {
    if (!window.confirm("Hapus file gambar yang tidak dipakai chapter mana pun? File yang masih dipakai tidak disentuh.")) return;
    setCleaning(true); setError(""); setNotice("");
    try {
      const t = await token();
      const res = await fetch("/api/scanlator/cleanup-storage", { method: "POST", headers: { Authorization: `Bearer ${t}` } });
      const json = (await res.json().catch(() => null)) as { success?: boolean; deleted?: number; freedBytes?: number; error?: string } | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Gagal membersihkan storage."); return; }
      const freed = ((json.freedBytes || 0) / (1024 * 1024)).toFixed(1);
      setNotice(json.deleted ? `${json.deleted} file tak terpakai dihapus · ${freed} MB kembali.` : "Tidak ada file tak terpakai.");
      const qRes = await fetch("/api/scanlator/quota", { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" });
      if (qRes.ok) setQuota(await qRes.json());
    } catch {
      setError("Gagal membersihkan storage.");
    } finally {
      setCleaning(false);
    }
  };

  const createSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusySeries(true); setError(""); setNotice("");
    try {
      const t = await token();
      const res = await fetch("/api/scanlator/series", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title, author, cover_url: coverUrl, description, type, is_adult: isAdult,
          rights_confirmed: rightsConfirmed,
          genres: genres.split(",").map((g) => g.trim()).filter(Boolean),
        }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Gagal membuat seri."); return; }
      setNotice("Seri terkirim — menunggu review admin.");
      setTitle(""); setAuthor(""); setCoverUrl(""); setDescription(""); setGenres(""); setIsAdult(false); setRightsConfirmed(false);
      await load();
    } finally { setBusySeries(false); }
  };

  const onAvatarFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploadingAvatar(true); setError("");
    try { setAvatarUrl(await uploadImage(file, "avatar", profile?.handle || "group")); }
    catch (err) { setError(err instanceof Error ? err.message : "Upload foto grup gagal."); }
    finally { setUploadingAvatar(false); }
  };

  const onCoverFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploadingCover(true); setError("");
    try { setCoverUrl(await uploadImage(file, "cover", profile?.handle || "cover")); }
    catch (err) { setError(err instanceof Error ? err.message : "Upload cover gagal."); }
    finally { setUploadingCover(false); }
  };

  const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

  const onChapterFiles = (files: FileList | null) => {
    if (!files?.length) return;
    void uploadBatch(Array.from(files));
  };

  const uploadBatch = async (input: File[]) => {
    if (!input.length) return;
    // Urutkan seperti dashboard Project: p1, p2, p10 — bukan p1, p10, p2.
    const list = [...input].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
    setUploadingChapter(true); setError(""); setNotice("");
    const startedAt = Date.now();
    setProgress({ total: list.length, done: 0, failed: [], failedFiles: [], currentName: "", savedBytes: 0, startedAt });

    for (let i = 0; i < list.length; i++) {
      const original = list[i];
      setProgress((p) => (p ? { ...p, currentName: original.name } : p));
      try {
        const url = await uploadImage(
          original,
          "chapter",
          chapterSlug || profile?.handle || "chapter",
          (saved) => setProgress((p) => (p ? { ...p, savedBytes: p.savedBytes + saved } : p)),
        );
        setChapterImages((prev) => [...prev, url]);
        setChapterBytes((n) => n + original.size);
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
      } catch (err) {
        const reason = err instanceof Error ? err.message : "Gagal upload";
        setProgress((p) => (p ? { ...p, failed: [...p.failed, { name: original.name, reason }], failedFiles: [...p.failedFiles, original] } : p));
        // Kuota habis: hentikan sisa antrean, tidak ada gunanya lanjut.
        if (/kuota/i.test(reason)) break;
      }
    }
    setUploadingChapter(false);
    setProgress((p) => (p ? { ...p, currentName: "" } : p));
    // Angka kuota berubah setelah upload — ambil ulang.
    void token().then((t) => fetch("/api/scanlator/quota", { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" }))
      .then((r) => (r.ok ? r.json() : null))
      .then((q) => { if (q) setQuota(q); })
      .catch(() => undefined);
  };

  const createChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyChapter(true); setError(""); setNotice("");
    try {
      const t = await token();
      const res = await fetch(`/api/scanlator/series/${encodeURIComponent(chapterSlug)}/chapter`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_number: Number(chapterNumber), title: chapterTitle, image_urls: chapterImages }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Gagal mengunggah chapter."); return; }
      const sentSlug = chapterSlug;
      setNotice(`Chapter ${chapterNumber} terkirim.`);
      setChapterNumber(""); setChapterTitle(""); setChapterImages([]); setChapterBytes(0); setProgress(null);
      if (sentSlug) {
        setMode("chapter");
        setTab("karya");
        await openProject(sentSlug, true);
        setProjectTab("chapter");
      }
    } finally { setBusyChapter(false); }
  };

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen bg-[var(--surface-0)] px-4 pb-20 pt-16 text-white">
      <div className="mx-auto w-full max-w-2xl">{children}</div>
    </main>
  );



  const openProject = async (slug: string, force = false) => {
    if (openSlug === slug && !force) { setOpenSlug(null); return; }
    setOpenSlug(slug); setDetailLoading(true); setChapters([]); setProjectTab("detail");
    try {
      const t = await token();
      const res = await fetch(`/api/scanlator/series/${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as {
          project: { title: string; author: string | null; description: string | null; type: string | null; genres: unknown; is_adult: boolean };
          chapters: Array<{ id: string; chapter_number: number; title: string | null; is_published: boolean; pages: number }>;
        };
        setEditTitle(json.project.title || "");
        setEditAuthor(json.project.author || "");
        setEditDesc(json.project.description || "");
        setEditType(json.project.type || "Manhwa");
        setEditGenres(Array.isArray(json.project.genres) ? (json.project.genres as string[]).join(", ") : "");
        setEditAdult(Boolean(json.project.is_adult));
        setChapters(json.chapters || []);
      }

      const statsRes = await fetch(`/api/scanlator/chapter-stats?slug=${encodeURIComponent(slug)}`, {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      }).catch(() => null);
      if (statsRes?.ok) {
        const stats = (await statsRes.json().catch(() => null)) as
          | { chapters?: Array<{ chapter_number: number; views: number }>; top?: { chapter_number: number; views: number } | null }
          | null;
        const map: Record<number, number> = {};
        for (const c of stats?.chapters || []) map[c.chapter_number] = c.views;
        setChapterViews(map);
        setTopChapter(stats?.top || null);
      }
    } catch { setError("Gagal memuat detail project."); }
    finally { setDetailLoading(false); }
  };

  const saveProjectEdit = async () => {
    if (!openSlug) return;
    setSavingEdit(true); setError(""); setNotice("");
    try {
      const t = await token();
      const res = await fetch(`/api/scanlator/series/${encodeURIComponent(openSlug)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle, author: editAuthor, description: editDesc, type: editType, is_adult: editAdult,
          genres: editGenres.split(",").map((g) => g.trim()).filter(Boolean),
        }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Gagal menyimpan."); return; }
      setNotice("Perubahan tersimpan — project masuk review admin lagi.");
      await load();
    } finally { setSavingEdit(false); }
  };

  const removeProject = async (slug: string, title: string) => {
    if (!window.confirm(`Hapus project "${title}"? Project akan diturunkan dari situs.`)) return;
    setError(""); setNotice("");
    try {
      const t = await token();
      const res = await fetch(`/api/scanlator/series/${encodeURIComponent(slug)}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Gagal menghapus."); return; }
      setNotice("Project dihapus.");
      setOpenSlug(null);
      await load();
    } catch { setError("Gagal menghapus project."); }
  };

  const moveImage = (from: number, to: number) => {
    setChapterImages((prev) => {
      if (to < 0 || to >= prev.length || from === to) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const removeChapter = async (chapterId: string, number: number) => {
    if (!openSlug) return;
    if (!window.confirm(`Hapus chapter ${number}?`)) return;
    setError(""); setNotice("");
    try {
      const t = await token();
      const res = await fetch(`/api/scanlator/series/${encodeURIComponent(openSlug)}/chapter/${chapterId}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Gagal menghapus chapter."); return; }
      setChapters((prev) => prev.filter((c) => c.id !== chapterId));
      setNotice(`Chapter ${number} dihapus.`);
    } catch { setError("Gagal menghapus chapter."); }
  };

  const loadChapter = async (chapterId: string, number: number, title: string | null) => {
    if (!openSlug) return;
    setError(""); setNotice("");
    try {
      const t = await token();
      const res = await fetch(`/api/scanlator/series/${encodeURIComponent(openSlug)}/chapter/${chapterId}`, {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; chapter?: { image_urls?: string[] }; error?: string } | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Gagal memuat chapter."); return; }
      return { id: chapterId, number, titles: title || "", images: json.chapter?.image_urls || [] };
    } catch {
      setError("Gagal memuat chapter.");
      return null;
    }
  };

  const openChapterEditor = async (chapterId: string, number: number, title: string | null) => {
    const data = await loadChapter(chapterId, number, title);
    if (data) setEditChapter(data);
  };

  const openChapterPreview = async (chapterId: string, number: number, title: string | null) => {
    const data = await loadChapter(chapterId, number, title);
    if (data) setPreviewChapter({ number, title, images: data.images });
  };

  const moveEditImage = (from: number, to: number) => {
    setEditChapter((prev) => {
      if (!prev) return prev;
      if (to < 0 || to >= prev.images.length || from === to) return prev;
      const images = [...prev.images];
      const [item] = images.splice(from, 1);
      images.splice(to, 0, item);
      return { ...prev, images };
    });
  };

  const saveChapterPages = async () => {
    if (!openSlug || !editChapter) return;
    if (editChapter.images.length === 0) { setError("Chapter minimal punya 1 gambar."); return; }
    setSavingPages(true); setError(""); setNotice("");
    try {
      const t = await token();
      const res = await fetch(`/api/scanlator/series/${encodeURIComponent(openSlug)}/chapter/${editChapter.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ image_urls: editChapter.images }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; reviewRequired?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Gagal menyimpan halaman."); return; }

      if (json.reviewRequired) {
        setNotice(`Revisi chapter ${editChapter.number} dikirim — menunggu ACC admin. Pembaca masih melihat versi lama.`);
      } else {
        setChapters((prev) => prev.map((c) => (c.id === editChapter.id ? { ...c, pages: editChapter.images.length } : c)));
        setNotice(`Halaman chapter ${editChapter.number} disimpan (${editChapter.images.length} gambar).`);
      }
      setEditChapter(null);
    } catch {
      setError("Gagal menyimpan halaman.");
    } finally {
      setSavingPages(false);
    }
  };

  const openChapterHistory = async (chapterId: string, number: number) => {
    if (!openSlug) return;
    setLoadingHistory(true); setError("");
    try {
      const t = await token();
      const res = await fetch(`/api/scanlator/series/${encodeURIComponent(openSlug)}/chapter/${chapterId}/revisions`, {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; revisions?: Array<{ id: string; action: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null; created_at: string }>; error?: string }
        | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Gagal memuat riwayat."); return; }
      setHistoryChapter({ number, items: json.revisions || [] });
    } catch {
      setError("Gagal memuat riwayat.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const saveChapterTitle = async (chapterId: string) => {
    if (!openSlug) return;
    const title = (chapterDraft[chapterId] || "").trim();
    if (!title) return;
    setError(""); setNotice("");
    try {
      const t = await token();
      const res = await fetch(`/api/scanlator/series/${encodeURIComponent(openSlug)}/chapter/${chapterId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Gagal menyimpan chapter."); return; }
      setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, title } : c)));
      setChapterDraft((d) => ({ ...d, [chapterId]: "" }));
      setNotice("Judul chapter tersimpan.");
    } catch { setError("Gagal menyimpan chapter."); }
  };

  if (loading) return shell(<p className="py-20 text-center text-[13px] text-white/40">Memuat…</p>);

  if (needLogin) return shell(
    <Panel className="mt-6 p-6 text-center">
      <p className="text-[13px] text-white/55">Masuk dulu untuk membuka studio.</p>
      <Link href="/" className="mt-4 inline-flex min-h-[40px] items-center rounded-lg bg-[var(--accent)] px-4 text-[12px] font-bold">Ke beranda</Link>
    </Panel>,
  );

  if (notScanlator || !profile) return shell(
    <Panel className="mt-6 p-6">
      <p className="text-[13px] font-bold">Akun Translation tidak aktif</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">
        Studio hanya untuk user yang sudah ACC admin. Kalau akun kamu baru dihapus atau dicabut,
        akses ini memang tertutup — ajukan ulang untuk membuka studio lagi.
      </p>
      <Link href="/scanlator/daftar" className="mt-4 inline-flex min-h-[40px] w-full items-center justify-center rounded-lg bg-[var(--accent)] text-[12px] font-bold">
        Ajukan Akun Translation
      </Link>
    </Panel>,
  );

  const published = works.filter((w) => w.is_published).length;
  const pendingWorks = works.filter((w) => w.review_status === "pending").length;
  const activeWork = works.find((w) => w.slug === openSlug) || null;
  const blocked = profile.status !== "active";

  return shell(
    <>
      {/* Identitas user */}
      <div className="flex items-center gap-3 pb-4">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-lg border border-white/[.08] object-cover" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/[.08] bg-white/[.04] text-base font-bold text-white/80">
            {profile.team_name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold leading-tight">{profile.team_name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-white/35">
            @{profile.handle}
            <span className="text-white/15">·</span>
            <StatusDot tone={profile.status === "active" ? "ok" : profile.status === "suspended" ? "warn" : "bad"} />
            {profile.status === "active" ? "Aktif" : profile.status === "suspended" ? "Suspend" : "Dicabut"}
            {profile.warnings > 0 && <><span className="text-white/15">·</span>{profile.warnings} SP</>}
          </p>
        </div>
        <Link href={`/scanlator/${profile.handle}`} aria-label="Halaman publik" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[.08] text-white/40 transition-colors hover:text-white">
          <FiArrowRight size={15} />
        </Link>
      </div>

      <div className="-mx-4"><Tabs tabs={TABS} active={tab} onChange={(id) => { setTab(id); setError(""); setNotice(""); }} /></div>

      {(notice || error) && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-[11px] font-semibold ${error ? "bg-rose-500/10 text-rose-200" : "bg-emerald-500/10 text-emerald-200"}`}>
          {error || notice}
        </p>
      )}

      {blocked && (
        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-400/20 bg-amber-500/[.06] px-3 py-2.5">
          <FiAlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" />
          <div className="text-[11px] leading-relaxed text-amber-100/80">
            <p className="font-bold">{profile.status === "revoked" ? "Akses dicabut" : "Akun disuspend"}</p>
            <p className="text-amber-100/50">
              {profile.status === "revoked" ? "Tidak bisa upload." : `Upload dibekukan${profile.suspended_until ? ` s.d. ${new Date(profile.suspended_until).toLocaleDateString("id-ID")}` : ""}.`}
            </p>
            <Link href="/scanlator/lapor?kind=appeal" className="mt-2 inline-flex min-h-[30px] items-center rounded-md border border-amber-300/30 px-2.5 text-[11px] font-bold text-amber-200">
              Ajukan banding
            </Link>
          </div>
        </div>
      )}

      <div className="pt-4">
        {tab === "ringkasan" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Project" value={works.length} />
              <Stat label="Terbit" value={published} tone="ok" />
              <Stat label="Menunggu ACC" value={pendingWorks} tone="warn" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Total tayangan" value={(stats?.totalViews ?? 0).toLocaleString("id-ID")} />
              <Stat label="Total chapter" value={(stats?.totalChapters ?? 0).toLocaleString("id-ID")} />
            </div>
            {stats && stats.projects.length > 0 && (
              <Panel>
                <PanelHead title="Project terpopuler" desc="Berdasarkan jumlah tayangan." />
                <ul className="divide-y divide-white/[.05]">
                  {stats.projects.slice(0, 3).map((p) => (
                    <li key={p.slug} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <span className="truncate text-[12px] text-white/75">{p.title}</span>
                      <span className="shrink-0 text-[11px] font-semibold text-white/40">{p.views.toLocaleString("id-ID")} tayangan</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            <Panel>
              <PanelHead title="Cara kerja" desc="Lima langkah dari pengajuan sampai terbit." />
              <ol className="divide-y divide-white/[.05]">
                {[
                  ["Ajukan Akun Translation", "Sekali saja, menunggu ACC admin."],
                  ["Upload seri", "Judul, cover, genre, tandai 18+ bila perlu."],
                  ["Upload chapter", "Gambar banyak sekaligus, otomatis jadi WebP."],
                  ["Review admin", "Disetujui → seri & chapter terbit."],
                  ["Dapat donasi", "Tautan donate tampil di halaman serimu."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-3 px-4 py-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/[.1] text-[10px] font-bold text-white/45">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-white/85">{t}</p>
                      <p className="text-[11px] leading-relaxed text-white/35">{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>

            <Panel>
              <Row className="flex items-center justify-between">
                <span className="text-[12px] text-white/60">Aturan & sanksi</span>
                <Link href="/aturan/scanlator" className="flex items-center gap-1 text-[11px] font-bold text-[var(--accent-2)]">Baca <FiArrowRight size={11} /></Link>
              </Row>
              <Row className="flex items-center justify-between">
                <span className="text-[12px] text-white/60">Direktori user</span>
                <Link href="/scanlator/direktori" className="flex items-center gap-1 text-[11px] font-bold text-[var(--accent-2)]">Buka <FiArrowRight size={11} /></Link>
              </Row>
              <Row className="flex items-center justify-between">
                <span className="text-[12px] text-white/60">Halaman publik user</span>
                <Link href={`/scanlator/${profile.handle}`} className="flex items-center gap-1 text-[11px] font-bold text-[var(--accent-2)]">Lihat <FiArrowRight size={11} /></Link>
              </Row>
            </Panel>
          </div>
        )}

        {tab === "upload" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => { setTab("karya"); if (chapterSlug) void openProject(chapterSlug, true); }}
              className="inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-[11px] font-semibold text-white/45 transition-colors hover:text-white"
            >
              <FiChevronLeft size={13} /> Kembali ke project
            </button>
            {quota && (
              <div className="rounded-lg border border-white/[.07] bg-white/[.02] px-3 py-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/45">Kuota storage</span>
                  <span className={`font-semibold ${quota.percent >= 90 ? "text-rose-300" : quota.percent >= 70 ? "text-amber-300" : "text-white/70"}`}>
                    {quota.usedLabel} / {quota.limitLabel}
                  </span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[.07]">
                  <div
                    className={`h-full rounded-full ${quota.percent >= 90 ? "bg-rose-400" : quota.percent >= 70 ? "bg-amber-400" : "bg-[var(--accent)]"}`}
                    style={{ width: `${Math.max(2, Math.min(100, quota.percent))}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-white/30">{quota.fileCount} file terpakai</p>
                  <button
                    type="button"
                    onClick={() => void cleanupStorage()}
                    disabled={cleaning}
                    className="text-[10px] font-semibold text-[var(--accent-2)] underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {cleaning ? "Membersihkan…" : "Bersihkan file tak terpakai"}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-1 rounded-lg border border-white/[.07] p-1">
              {(["seri", "chapter"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={`min-h-[36px] flex-1 rounded-md text-[12px] font-bold capitalize transition-colors ${mode === m ? "bg-white/[.08] text-white" : "text-white/40"}`}>
                  {m === "seri" ? "Seri baru" : "Chapter"}
                </button>
              ))}
            </div>

            {mode === "seri" ? (
              <form onSubmit={createSeries} className="space-y-3">
                <Panel>
                  <PanelHead title="Upload seri" desc="Isi data, unggah cover, lalu kirim untuk review." />
                  <div className="space-y-4 p-4">
                    <Field label="Judul seri" htmlFor="s-title">
                      <input id="s-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required placeholder="Judul seri" className={inputClass} />
                    </Field>
                    <Field label="Author komik (opsional)" htmlFor="s-author">
                      <input id="s-author" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={100} placeholder="Nama author / kreator asli" className={inputClass} />
                    </Field>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-white/55">Cover</p>
                        <span className={`text-[10px] ${coverUrl ? "text-emerald-300/80" : "text-white/30"}`}>
                          {uploadingCover ? "mengunggah…" : coverUrl ? "siap" : "wajib"}
                        </span>
                      </div>
                      <label className="flex items-center gap-3 rounded-lg border border-dashed border-white/[.14] bg-white/[.02] p-3 transition-colors hover:border-[var(--accent)]/50 hover:bg-white/[.04]">
                        {coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={coverUrl} alt="Cover" className="h-16 w-12 shrink-0 rounded border border-white/[.08] object-cover" />
                        ) : (
                          <span className="flex h-16 w-12 shrink-0 items-center justify-center rounded border border-white/[.08] bg-white/[.04] text-white/25">
                            <FiImage size={16} />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11.5px] font-semibold text-white/75">{coverUrl ? "Ganti cover" : "Pilih cover"}</span>
                          <span className="mt-0.5 block text-[10px] leading-snug text-white/35">JPG/PNG/WebP · otomatis jadi WebP 95</span>
                        </span>
                        <input type="file" accept="image/*" onChange={(e) => void onCoverFile(e.target.files)} className="hidden" />
                        <span className="shrink-0 rounded-md border border-white/[.12] px-2.5 py-1.5 text-[10.5px] font-bold text-white/70">Pilih</span>
                      </label>
                    </div>
                    <Field label="Deskripsi">
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={3000} placeholder="Ringkasan cerita…" className={inputClass} />
                    </Field>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="Tipe">
                        <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                          {["Manhwa", "Manhua", "Manga", "Novel"].map((t) => <option key={t} value={t} className="bg-[#14121c]">{t}</option>)}
                        </select>
                      </Field>
                      <Field label="Genre">
                        <input value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="Aksi, Fantasi" className={inputClass} />
                      </Field>
                    </div>
                    <label className="flex items-start gap-2.5 rounded-lg border border-white/[.06] px-3 py-2.5 text-[11px] leading-relaxed text-white/55">
                      <input type="checkbox" checked={isAdult} onChange={(e) => setIsAdult(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#8b5cf6]" />
                      Konten 18+ (penentu filter, bukan genre)
                    </label>
                    <label className="flex items-start gap-2.5 rounded-lg border border-white/[.06] px-3 py-2.5 text-[11px] leading-relaxed text-white/55">
                      <input type="checkbox" checked={rightsConfirmed} onChange={(e) => setRightsConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#8b5cf6]" />
                      Karya ini hasil terjemahan saya sendiri, bukan re-upload dari user lain.
                    </label>
                  </div>
                </Panel>
                <Button type="submit" disabled={busySeries || !coverUrl || blocked || !rightsConfirmed} className="w-full">
                  <FiSend size={13} /> {busySeries ? "Mengirim…" : "Kirim untuk review"}
                </Button>
              </form>
            ) : (
              <form onSubmit={createChapter} className="space-y-3">
                <Panel>
                  <PanelHead title="Upload chapter" desc="Pilih seri, isi nomor, lalu unggah gambarnya." />
                  <div className="space-y-4 p-4">
                    {chapterSlug && works.some((w) => w.slug === chapterSlug) ? (
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold text-white/55">Seri</p>
                        <div className="flex items-center gap-2.5 rounded-lg border border-white/[.07] bg-white/[.02] p-2.5">
                          {works.find((w) => w.slug === chapterSlug)?.cover_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={works.find((w) => w.slug === chapterSlug)?.cover_url as string} alt="" className="h-12 w-9 shrink-0 rounded border border-white/[.08] object-cover" />
                          ) : (
                            <span className="flex h-12 w-9 shrink-0 items-center justify-center rounded border border-white/[.08] bg-white/[.04] text-white/25"><FiBookOpen size={13} /></span>
                          )}
                          <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white/85">{works.find((w) => w.slug === chapterSlug)?.title}</p>
                          <button
                            type="button"
                            onClick={() => setTab("karya")}
                            className="shrink-0 text-[10.5px] font-bold text-[var(--accent-2)]"
                          >
                            Ganti
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Field label="Seri">
                        <select value={chapterSlug} onChange={(e) => setChapterSlug(e.target.value)} required className={inputClass}>
                          <option value="" className="bg-[#14121c]">Pilih seri…</option>
                          {works.map((w) => <option key={w.slug} value={w.slug} className="bg-[#14121c]">{w.title}</option>)}
                        </select>
                      </Field>
                    )}
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="Nomor">
                        <input value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} placeholder="12 / 12.5" inputMode="decimal" required className={inputClass} />
                      </Field>
                      <Field label="Judul">
                        <input value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder="Opsional" className={inputClass} />
                      </Field>
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-white/55">Gambar chapter</p>
                        <span className="text-[10px] text-white/30">{chapterImages.length}/100</span>
                      </div>
                      <label
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files?.length) void uploadBatch(Array.from(e.dataTransfer.files));
                        }}
                        className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[.14] bg-white/[.02] px-4 py-6 text-center transition-colors hover:border-[var(--accent)]/50 hover:bg-white/[.04]"
                      >
                        <FiImage size={20} className="text-white/30" />
                        <span className="text-[12px] font-semibold text-white/75">
                          {uploadingChapter ? "Mengunggah gambar…" : "Tarik gambar ke sini, atau ketuk untuk pilih"}
                        </span>
                        <span className="text-[10px] leading-snug text-white/35">
                          Bisa banyak file sekaligus · diurutkan otomatis (p1, p2, p10) · maks 30 MB/gambar
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={uploadingChapter}
                          onChange={(e) => { void onChapterFiles(e.target.files); e.currentTarget.value = ""; }}
                          className="hidden"
                        />
                      </label>
                      {chapterImages.length > 0 && (
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/35">
                          <span>{chapterImages.length} gambar · {formatSize(chapterBytes)}</span>
                          <button
                            type="button"
                            onClick={() => { setChapterImages([]); setChapterBytes(0); setProgress(null); }}
                            className="font-semibold text-white/45 transition-colors hover:text-rose-300"
                          >
                            Kosongkan
                          </button>
                        </div>
                      )}
                    </div>

                    {progress && (
                      <div className="rounded-lg border border-white/[.07] bg-white/[.02] p-3">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-white/70">
                            {uploadingChapter
                              ? `Mengunggah ${progress.done + progress.failed.length + 1}/${progress.total}`
                              : `Selesai ${progress.done}/${progress.total}`}
                          </span>
                          <span className="text-white/35">
                            {Math.round(((progress.done + progress.failed.length) / Math.max(1, progress.total)) * 100)}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[.07]">
                          <div
                            className={`h-full rounded-full transition-[width] ${progress.failed.length > 0 ? "bg-amber-400" : "bg-[var(--accent)]"}`}
                            style={{ width: `${Math.max(2, ((progress.done + progress.failed.length) / Math.max(1, progress.total)) * 100)}%` }}
                          />
                        </div>
                        <p className="mt-1.5 truncate text-[10px] text-white/35">
                          {uploadingChapter
                            ? progress.currentName || "menyiapkan…"
                            : `${progress.done} berhasil${progress.failed.length ? ` · ${progress.failed.length} gagal` : ""}`}
                        </p>
                        {!uploadingChapter && progress.failedFiles.length > 0 && (
                          <button
                            type="button"
                            onClick={() => void uploadBatch(progress.failedFiles)}
                            className="mt-2 flex min-h-[32px] w-full items-center justify-center rounded-md border border-amber-300/30 text-[11px] font-bold text-amber-200"
                          >
                            Ulangi {progress.failedFiles.length} gambar yang gagal
                          </button>
                        )}
                        {progress.failed.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {progress.failed.slice(0, 5).map((f, i) => (
                              <li key={`${f.name}-${i}`} className="truncate rounded bg-rose-500/10 px-2 py-1 text-[10px] text-rose-200">
                                {f.name}: {f.reason}
                              </li>
                            ))}
                            {progress.failed.length > 5 && <li className="text-[10px] text-white/35">+{progress.failed.length - 5} lainnya</li>}
                          </ul>
                        )}
                      </div>
                    )}

                    {chapterImages.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold text-white/55">Pratinjau urutan ({chapterImages.length})</p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {chapterImages.map((url, i) => (
                            <div
                              key={`${url}-${i}`}
                              draggable
                              onDragStart={() => setDragIndex(i)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => { if (dragIndex !== null) moveImage(dragIndex, i); setDragIndex(null); }}
                              onDragEnd={() => setDragIndex(null)}
                              className={`relative select-none overflow-hidden rounded-md border ${dragIndex === i ? "border-[var(--accent)]" : "border-white/[.07]"}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={`Halaman ${i + 1}`} loading="lazy" draggable={false} className="aspect-[3/4] w-full object-cover" />
                              <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[9px] font-bold text-white/80">{i + 1}</span>
                              <button
                                type="button"
                                onClick={() => setChapterImages((prev) => prev.filter((_, idx) => idx !== i))}
                                aria-label={`Hapus halaman ${i + 1}`}
                                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-black/70 text-rose-300"
                              >
                                <FiX size={11} />
                              </button>
                              <div className="absolute inset-x-0 bottom-0 flex">
                                <button
                                  type="button"
                                  onClick={() => moveImage(i, i - 1)}
                                  disabled={i === 0}
                                  aria-label={`Geser halaman ${i + 1} ke kiri`}
                                  className="flex h-6 flex-1 items-center justify-center bg-black/60 text-white/70 disabled:opacity-25"
                                >
                                  <FiChevronLeft size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveImage(i, i + 1)}
                                  disabled={i === chapterImages.length - 1}
                                  aria-label={`Geser halaman ${i + 1} ke kanan`}
                                  className="flex h-6 flex-1 items-center justify-center bg-black/60 text-white/70 disabled:opacity-25"
                                >
                                  <FiChevronRight size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="mt-1 text-[10px] text-white/30">Tarik gambar untuk mengubah urutan, atau pakai tombol panah.</p>
                      </div>
                    )}
                  </div>
                </Panel>
                <div className="flex items-center justify-between rounded-lg border border-white/[.07] bg-white/[.02] px-3 py-2 text-[10.5px]">
                  <span className={chapterImages.length ? "text-white/60" : "text-white/30"}>
                    {chapterImages.length ? `${chapterImages.length} gambar · ${formatSize(chapterBytes)}` : "Belum ada gambar"}
                  </span>
                  <span className={chapterSlug ? "text-emerald-300/80" : "text-amber-300/70"}>
                    {chapterSlug ? "seri dipilih" : "pilih seri dulu"}
                  </span>
                </div>
                <Button type="submit" disabled={busyChapter || !chapterSlug || chapterImages.length === 0 || blocked} className="w-full">
                  <FiSend size={13} /> {busyChapter ? "Mengirim…" : `Kirim chapter${chapterImages.length ? ` (${chapterImages.length} gambar)` : ""}`}
                </Button>
              </form>
            )}
          </div>
        )}

        {tab === "karya" && (
          <div className="space-y-3">
          <Panel>
            <PanelHead
              title={`Project (${works.length})`}
              desc={pendingWorks > 0 ? `${pendingWorks} menunggu review` : "Ketuk salah satu project untuk kelola chapter"}
              right={works.length > 0 ? <Button variant="ghost" onClick={() => { setTab("upload"); setMode("seri"); }}><FiPlus size={12} /> Seri</Button> : undefined}
            />
            {works.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <FiBookOpen size={20} className="mx-auto text-white/20" />
                <p className="mt-2 text-[12px] text-white/35">Belum ada project.</p>
                <Button className="mt-3" onClick={() => { setTab("upload"); setMode("seri"); }}><FiPlus size={12} /> Upload seri</Button>
              </div>
            ) : openSlug ? (
              <div className="p-3">
                <button
                  type="button"
                  onClick={() => setOpenSlug(null)}
                  className="mb-2 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-[11px] font-semibold text-white/45 transition-colors hover:text-white"
                >
                  <FiChevronLeft size={13} /> Semua project
                </button>
                {activeWork && (
                  <div className="mb-3 flex items-center gap-2.5">
                    {activeWork.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={activeWork.cover_url} alt="" className="h-12 w-9 shrink-0 rounded border border-white/[.08] object-cover" />
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-bold text-white/90">{activeWork.title}</p>
                      <p className="text-[10px] text-white/35">{chapters.length} chapter · {activeWork.type || "—"}</p>
                    </div>
                  </div>
                )}
                                        {detailLoading ? (
                          <p className="py-4 text-center text-[11px] text-white/35">Memuat…</p>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex gap-1 rounded-lg border border-white/[.07] p-1">
                              {(["detail", "chapter"] as const).map((pt) => (
                                <button
                                  key={pt}
                                  type="button"
                                  onClick={() => setProjectTab(pt)}
                                  className={`min-h-[32px] flex-1 rounded-md text-[11px] font-bold capitalize transition-colors ${projectTab === pt ? "bg-white/[.08] text-white" : "text-white/40"}`}
                                >
                                  {pt === "detail" ? "Detail" : `Chapter (${chapters.length})`}
                                </button>
                              ))}
                            </div>

                            {projectTab === "detail" && (
                            <div className="space-y-3">
                            <Field label="Judul project"><input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={inputClass} /></Field>
                            <Field label="Author komik (opsional)"><input value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} maxLength={100} placeholder="Nama author / kreator asli" className={inputClass} /></Field>
                            <Field label="Deskripsi"><textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} className={inputClass} /></Field>
                            <div className="grid grid-cols-2 gap-2.5">
                              <Field label="Tipe">
                                <select value={editType} onChange={(e) => setEditType(e.target.value)} className={inputClass}>
                                  {["Manhwa", "Manhua", "Manga", "Novel"].map((t) => <option key={t} value={t} className="bg-[#14121c]">{t}</option>)}
                                </select>
                              </Field>
                              <Field label="Genre"><input value={editGenres} onChange={(e) => setEditGenres(e.target.value)} className={inputClass} /></Field>
                            </div>
                            <label className="flex items-center gap-2 text-[11px] text-white/55">
                              <input type="checkbox" checked={editAdult} onChange={(e) => setEditAdult(e.target.checked)} className="h-4 w-4 accent-[#8b5cf6]" />
                              Konten 18+
                            </label>

                            <div className="grid grid-cols-2 gap-2">
                              <Button onClick={() => void saveProjectEdit()} disabled={savingEdit}><FiSave size={12} /> {savingEdit ? "Menyimpan…" : "Simpan"}</Button>
                              <Button variant="danger" onClick={() => void removeProject(activeWork?.slug || "", activeWork?.title || "")}><FiTrash2 size={12} /> Hapus</Button>
                            </div>
                            </div>
                            )}

                            {projectTab === "chapter" && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!openSlug || !activeWork) return;
                                  setChapterSlug(openSlug);
                                  setMode("chapter");
                                  setTab("upload");
                                }}
                                className="mb-2 flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[11.5px] font-bold text-white"
                              >
                                <FiPlus size={13} /> Chapter baru
                              </button>
                              {topChapter && (
                                <p className="mb-2 rounded-md border border-white/[.06] bg-white/[.02] px-2.5 py-1.5 text-[10px] text-white/45">
                                  Terpopuler: <strong className="font-bold text-white/75">Ch. {topChapter.chapter_number}</strong> · {topChapter.views.toLocaleString("id-ID")} tayangan
                                </p>
                              )}
                              <div className="mt-1.5 space-y-1.5">
                                {chapters.map((c) => (
                                  <div key={c.id} className="rounded-md border border-white/[.06] bg-white/[.02] p-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="min-w-0 truncate text-[11px] text-white/70">
                                        Ch. {c.chapter_number} · {c.title || "Tanpa judul"} · {c.pages} gambar
                                        <span className="ml-1 text-[10px] text-white/35">· 👁 {chapterViews[c.chapter_number] ?? 0}</span>
                                        {!c.is_published && <span className="ml-1 text-[10px] text-amber-300">(belum terbit)</span>}
                                      </p>
                                      <button type="button" onClick={() => void removeChapter(c.id, c.chapter_number)} aria-label={`Hapus chapter ${c.chapter_number}`} className="shrink-0 rounded p-1 text-rose-300/70 transition-colors hover:text-rose-300">
                                        <FiTrash2 size={12} />
                                      </button>
                                    </div>
                                    <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => void openChapterPreview(c.id, c.chapter_number, c.title)}
                                        className="flex min-h-[30px] items-center justify-center gap-1 rounded-md border border-white/[.08] text-[10px] font-bold text-white/60 transition-colors hover:bg-white/[.04] hover:text-white"
                                      >
                                        <FiEye size={11} /> Pratinjau
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void openChapterEditor(c.id, c.chapter_number, c.title)}
                                        className="flex min-h-[30px] items-center justify-center gap-1 rounded-md border border-white/[.08] text-[10px] font-bold text-[var(--accent-2)] transition-colors hover:bg-white/[.04]"
                                      >
                                        <FiImage size={11} /> Edit halaman
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void openChapterHistory(c.id, c.chapter_number)}
                                        disabled={loadingHistory}
                                        className="flex min-h-[30px] items-center justify-center gap-1 rounded-md border border-white/[.08] text-[10px] font-bold text-white/55 transition-colors hover:bg-white/[.04] hover:text-white"
                                      >
                                        <FiClock size={11} /> Riwayat
                                      </button>
                                    </div>

                                    <div className="mt-1.5 flex gap-1.5">
                                      <input
                                        value={chapterDraft[c.id] ?? ""}
                                        onChange={(e) => setChapterDraft((d) => ({ ...d, [c.id]: e.target.value }))}
                                        placeholder="Ubah judul chapter…"
                                        className="min-w-0 flex-1 rounded-md border border-white/[.08] bg-white/[.03] px-2 py-1.5 text-[11px] text-white placeholder:text-white/25 outline-none focus:border-[var(--accent)]/60"
                                      />
                                      <button type="button" onClick={() => void saveChapterTitle(c.id)} className="shrink-0 rounded-md border border-white/[.1] px-2.5 text-[11px] font-bold text-white/70 transition-colors hover:text-white">
                                        Simpan
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                {chapters.length === 0 && <p className="py-3 text-center text-[11px] text-white/30">Belum ada chapter.</p>}
                              </div>
                            </div>
                            )}
                          </div>
                        )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-3">
                {works.map((w) => (
                  <button
                    key={w.slug}
                    type="button"
                    onClick={() => void openProject(w.slug)}
                    className="group min-w-0 text-left"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-white/[.07] bg-white/[.04]">
                      {w.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={w.cover_url} alt={w.title} loading="lazy" className="h-full w-full object-cover transition-opacity group-hover:opacity-85" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/20"><FiBookOpen size={18} /></div>
                      )}
                      <span className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wide ${
                        w.is_published ? "bg-emerald-400/90 text-black" : w.review_status === "rejected" ? "bg-rose-400/90 text-black" : "bg-amber-300/90 text-black"
                      }`}>
                        {w.is_published ? "Terbit" : w.review_status === "approved" ? "Sudah ACC · Tunggu Ch" : w.review_status === "rejected" ? "Ditolak" : "Menunggu ACC"}
                      </span>
                      {w.chapters ? (
                        <span className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[8.5px] font-bold text-white/80">{w.chapters} ch</span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 truncate text-[11.5px] font-semibold leading-tight text-white/85">{w.title}</p>
                    <p className="truncate text-[10px] text-white/35">{w.type || "—"}{w.is_adult ? " · 18+" : ""}</p>
                  </button>
                ))}
              </div>
            )}
          </Panel>
          </div>
        )}

        {tab === "profil" && (
          <form onSubmit={saveProfile} className="space-y-3">
            <Panel>
              <PanelHead title="Identitas" desc={`Handle @${profile.handle} tidak bisa diubah.`} />
              <div className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-white/[.08] object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-white/[.08] bg-white/[.04] text-lg font-bold text-white/60">
                      {teamName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-[11px] font-semibold text-white/60">
                      Foto grup {uploadingAvatar && <span className="font-normal text-[var(--accent-2)]">mengunggah…</span>}
                    </label>
                    <input type="file" accept="image/*" onChange={(e) => void onAvatarFile(e.target.files)} className="w-full text-[11px] text-white/45 file:mr-2 file:rounded-md file:border-0 file:bg-white/[.08] file:px-2.5 file:py-1.5 file:text-[11px] file:font-bold file:text-white/80" />
                    <p className="mt-1 text-[10px] text-white/30">Kosongkan = pakai foto profil akunmu.</p>
                  </div>
                </div>
                <Field label="Nama user">
                  <input value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={80} className={inputClass} />
                </Field>
                <Field label="Bio">
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={1000} placeholder="Tentang kamu…" className={inputClass} />
                </Field>
              </div>
            </Panel>

            <Panel>
              <PanelHead title="Kontak" desc="Discord — dipakai admin untuk menghubungi. Tidak tampil publik." />
              <div className="space-y-3 p-4">
                <Field label="Username Discord" hint="tanpa @">
                  <input value={cDc} onChange={(e) => setCDc(e.target.value)} placeholder="username" className={inputClass} />
                </Field>
              </div>
            </Panel>

            <Panel>
              <PanelHead title="Tautan donate" desc="Tampil di seri milikmu. Uang langsung ke akunmu." />
              <div className="space-y-3 p-4">
                <Field label="DANA / GoPay"><input value={dana} onChange={(e) => setDana(e.target.value)} placeholder="https://dana.link/…" className={inputClass} /></Field>
                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="Trakteer"><input value={trakteer} onChange={(e) => setTrakteer(e.target.value)} placeholder="https://trakteer.id/…" className={inputClass} /></Field>
                  <Field label="Tako"><input value={tako} onChange={(e) => setTako(e.target.value)} placeholder="https://tako.id/…" className={inputClass} /></Field>
                </div>
                <Field label="Lainnya"><input value={lain} onChange={(e) => setLain(e.target.value)} placeholder="https://…" className={inputClass} /></Field>
              </div>
            </Panel>

            <Button type="submit" disabled={savingProfile} className="w-full">
              <FiEdit3 size={13} /> {savingProfile ? "Menyimpan…" : "Simpan perubahan"}
            </Button>
          </form>
        )}
      </div>

      {/* Riwayat revisi chapter */}
      {historyChapter && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-t-xl border border-white/[.08] bg-[#111115] sm:rounded-xl">
            <div className="flex items-center justify-between border-b border-white/[.07] px-4 py-3">
              <div>
                <p className="text-[13px] font-bold">Riwayat · Ch. {historyChapter.number}</p>
                <p className="text-[10px] text-white/35">{historyChapter.items.length} catatan terakhir</p>
              </div>
              <button type="button" onClick={() => setHistoryChapter(null)} aria-label="Tutup" className="rounded-md p-1.5 text-white/60">
                <FiX size={16} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {historyChapter.items.length === 0 ? (
                <p className="py-10 text-center text-[11px] text-white/30">Belum ada catatan revisi.</p>
              ) : (
                <ul className="divide-y divide-white/[.05]">
                  {historyChapter.items.map((r) => {
                    const label =
                      r.action === "edit_pages" ? "Ganti halaman"
                      : r.action === "edit_title" ? "Ubah judul"
                      : r.action === "approve" ? "Disetujui admin"
                      : r.action === "reject" ? "Ditolak admin"
                      : r.action === "delete" ? "Chapter dihapus"
                      : "Dibuat";
                    const pages = (r.after?.pages ?? r.before?.pages) as number | undefined;
                    return (
                      <li key={r.id} className="px-4 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-white/80">{label}</span>
                          <span className="shrink-0 text-[10px] text-white/30">
                            {new Date(r.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {pages !== undefined && (
                          <p className="mt-0.5 text-[10px] text-white/35">
                            {r.before?.pages !== undefined && r.action === "edit_pages"
                              ? `${r.before.pages} → ${pages} gambar`
                              : `${pages} gambar`}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editor halaman chapter — hapus / ubah urutan */}
      {editChapter && (
        <div className="fixed inset-0 z-[130] flex flex-col bg-black/85" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between border-b border-white/[.08] px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold">Edit halaman · Ch. {editChapter.number}</p>
              <p className="text-[10px] text-white/35">{editChapter.images.length} gambar · tarik atau pakai panah</p>
            </div>
            <button type="button" onClick={() => setEditChapter(null)} aria-label="Tutup" className="rounded-md p-1.5 text-white/60">
              <FiX size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="mx-auto grid max-w-2xl grid-cols-3 gap-1.5">
              {editChapter.images.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragIndex !== null) moveEditImage(dragIndex, i); setDragIndex(null); }}
                  onDragEnd={() => setDragIndex(null)}
                  className={`relative overflow-hidden rounded-md border ${dragIndex === i ? "border-[var(--accent)]" : "border-white/[.08]"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Halaman ${i + 1}`} loading="lazy" draggable={false} className="aspect-[3/4] w-full object-cover" />
                  <span className="absolute left-1 top-1 rounded bg-black/75 px-1 text-[9px] font-bold">{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setEditChapter((prev) => (prev ? { ...prev, images: prev.images.filter((_, idx) => idx !== i) } : prev))}
                    aria-label={`Hapus halaman ${i + 1}`}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-black/75 text-rose-300"
                  >
                    <FiX size={11} />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 flex">
                    <button type="button" onClick={() => moveEditImage(i, i - 1)} disabled={i === 0} aria-label="Geser kiri" className="flex h-6 flex-1 items-center justify-center bg-black/65 text-white/70 disabled:opacity-25">
                      <FiChevronLeft size={12} />
                    </button>
                    <button type="button" onClick={() => moveEditImage(i, i + 1)} disabled={i === editChapter.images.length - 1} aria-label="Geser kanan" className="flex h-6 flex-1 items-center justify-center bg-black/65 text-white/70 disabled:opacity-25">
                      <FiChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/[.08] px-4 py-3">
            <div className="mx-auto flex max-w-2xl gap-2">
              <Button variant="ghost" onClick={() => setEditChapter(null)} className="flex-1">Batal</Button>
              <Button onClick={() => void saveChapterPages()} disabled={savingPages} className="flex-1">
                <FiSave size={12} /> {savingPages ? "Menyimpan…" : "Simpan halaman"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pratinjau baca chapter */}
      {previewChapter && (
        <div className="fixed inset-0 z-[130] flex flex-col bg-black" role="dialog" aria-modal="true">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold">Ch. {previewChapter.number}{previewChapter.title ? ` · ${previewChapter.title}` : ""}</p>
              <p className="text-[10px] text-white/40">{previewChapter.images.length} gambar · pratinjau</p>
            </div>
            <button type="button" onClick={() => setPreviewChapter(null)} aria-label="Tutup" className="rounded-md p-1.5 text-white/70">
              <FiX size={16} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y">
            <div className="mx-auto max-w-2xl">
              {previewChapter.images.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${url}-${i}`}
                  src={url}
                  alt={`Halaman ${i + 1}`}
                  loading={i < 3 ? "eager" : "lazy"}
                  decoding="async"
                  className="block w-full select-none"
                />
              ))}
              {previewChapter.images.length === 0 && <p className="py-16 text-center text-[12px] text-white/35">Belum ada gambar.</p>}
              {previewChapter.images.length > 0 && (
                <p className="py-8 text-center text-[11px] text-white/30">Akhir chapter · {previewChapter.images.length} halaman</p>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-white/10 bg-black px-4 py-2.5">
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
              <span className="text-[10px] text-white/35">Pratinjau · tidak dihitung sebagai tayangan</span>
              <button type="button" onClick={() => setPreviewChapter(null)} className="rounded-md border border-white/[.12] px-3 py-1.5 text-[11px] font-bold text-white/70">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
  );
}
