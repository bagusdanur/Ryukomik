"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FiAlertTriangle, FiArrowRight, FiBookOpen, FiClock, FiEdit3, FiEye, FiImage,
  FiChevronDown, FiChevronLeft, FiChevronRight, FiPlus, FiSave, FiSend, FiTrash2, FiUser, FiX,
} from "react-icons/fi";
import { getSession } from "@/lib/auth/getSession";
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
  review_status: string | null; review_note?: string | null; is_published: boolean; is_adult: boolean;
};

type Notif = {
  id: string; type: string; title: string; body: string | null; link: string | null;
  read_at: string | null; created_at: string;
};

type TabId = "ringkasan" | "upload" | "karya" | "profil";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "ringkasan", label: "Ringkasan" },
  { id: "upload", label: "Upload" },
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
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
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
  const [topChapter, setTopChapter] = useState<{ chapter_number: number; views: number } | null>(null);
  const [editTitle, setEditTitle] = useState("");
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
      if (pRes.status === 403) { setNotScanlator(true); return; }
      if (pRes.ok) {
        const json = (await pRes.json()) as { profile?: Profile | null };
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
      const nRes = await fetch("/api/scanlator/notifications", { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" }).catch(() => null);
      if (nRes?.ok) {
        const nj = (await nRes.json()) as { notifications?: Notif[]; unread?: number };
        setNotifs(nj.notifications || []);
        setUnread(nj.unread || 0);
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
  const uploadImage = async (file: File, kind: "cover" | "chapter" | "avatar", slug: string, watermark = false) => {
    const t = await token();

    // Watermark digambar di server (bukan saat upload langsung), jadi halaman
    // terakhir chapter tetap lewat jalur server.
    try {
      if (watermark) throw new Error("server-path");
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
        const put = await fetch(presign.presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "image/webp" },
          body: file,
        }).catch(() => null);
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

    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    fd.append("slug", slug);
    if (watermark) fd.append("watermark", "true");
    const res = await fetch("/api/scanlator/upload-image", { method: "POST", headers: { Authorization: `Bearer ${t}` }, body: fd });
    const json = (await res.json().catch(() => null)) as { success?: boolean; url?: string; error?: string } | null;
    if (!res.ok || !json?.success || !json.url) throw new Error(json?.error || "Upload gagal.");
    return json.url;
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
          title, cover_url: coverUrl, description, type, is_adult: isAdult,
          rights_confirmed: rightsConfirmed,
          genres: genres.split(",").map((g) => g.trim()).filter(Boolean),
        }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Gagal membuat seri."); return; }
      setNotice("Seri terkirim — menunggu review admin.");
      setTitle(""); setCoverUrl(""); setDescription(""); setGenres(""); setIsAdult(false); setRightsConfirmed(false);
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
        const url = await uploadImage(original, "chapter", chapterSlug || profile?.handle || "chapter", i === list.length - 1);
        setChapterImages((prev) => [...prev, url]);
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
      setNotice(`Chapter ${chapterNumber} terkirim.`);
      setChapterNumber(""); setChapterTitle(""); setChapterImages([]);
    } finally { setBusyChapter(false); }
  };

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen bg-[var(--surface-0)] px-4 pb-20 pt-16 text-white">
      <div className="mx-auto w-full max-w-2xl">{children}</div>
    </main>
  );

  const markAllRead = async () => {
    try {
      const t = await token();
      await fetch("/api/scanlator/notifications", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifs((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnread(0);
    } catch { /* diamkan */ }
  };

  const openProject = async (slug: string) => {
    if (openSlug === slug) { setOpenSlug(null); return; }
    setOpenSlug(slug); setDetailLoading(true); setChapters([]); setProjectTab("detail");
    try {
      const t = await token();
      const res = await fetch(`/api/scanlator/series/${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as {
          project: { title: string; description: string | null; type: string | null; genres: unknown; is_adult: boolean };
          chapters: Array<{ id: string; chapter_number: number; title: string | null; is_published: boolean; pages: number }>;
        };
        setEditTitle(json.project.title || "");
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
          title: editTitle, description: editDesc, type: editType, is_adult: editAdult,
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
      <p className="text-[13px] font-bold">Belum punya Akun Translation</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">
        Studio hanya untuk akun yang sudah ACC admin. Ajukan dulu, lalu tunggu review.
      </p>
      <Link href="/scanlator/daftar" className="mt-4 inline-flex min-h-[40px] w-full items-center justify-center rounded-lg bg-[var(--accent)] text-[12px] font-bold">
        Ajukan Akun Translation
      </Link>
    </Panel>,
  );

  const published = works.filter((w) => w.review_status === "approved").length;
  const pendingWorks = works.filter((w) => w.review_status === "pending").length;
  const blocked = profile.status !== "active";

  return shell(
    <>
      {/* Identitas tim — ringkas, tanpa hero bergradien */}
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
              <Stat label="Review" value={pendingWorks} tone="warn" />
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

            {notifs.length > 0 && (
              <Panel>
                <PanelHead
                  title={`Notifikasi${unread > 0 ? ` · ${unread} baru` : ""}`}
                  desc="Status project dan tindakan admin."
                  right={unread > 0 ? <Button variant="ghost" onClick={() => void markAllRead()}>Tandai dibaca</Button> : undefined}
                />
                <ul className="divide-y divide-white/[.05]">
                  {notifs.slice(0, 6).map((n) => (
                    <li key={n.id} className="px-4 py-2.5">
                      <div className="flex items-start gap-2">
                        {!n.read_at && <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-2)]" />}
                        <div className="min-w-0 flex-1">
                          <p className={`text-[12px] ${n.read_at ? "text-white/65" : "font-semibold text-white"}`}>{n.title}</p>
                          {n.body && <p className="mt-0.5 text-[11px] leading-relaxed text-white/40">{n.body}</p>}
                          <p className="mt-1 text-[10px] text-white/25">
                            {new Date(n.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      </div>
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
                  ["Upload chapter", "Gambar banyak sekaligus, watermark otomatis."],
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
                <span className="text-[12px] text-white/60">Direktori semua tim</span>
                <Link href="/scanlator/direktori" className="flex items-center gap-1 text-[11px] font-bold text-[var(--accent-2)]">Buka <FiArrowRight size={11} /></Link>
              </Row>
              <Row className="flex items-center justify-between">
                <span className="text-[12px] text-white/60">Halaman publik tim</span>
                <Link href={`/scanlator/${profile.handle}`} className="flex items-center gap-1 text-[11px] font-bold text-[var(--accent-2)]">Lihat <FiArrowRight size={11} /></Link>
              </Row>
            </Panel>
          </div>
        )}

        {tab === "upload" && (
          <div className="space-y-3">
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
                <p className="mt-1 text-[10px] text-white/30">{quota.fileCount} file terpakai · hapus chapter lama kalau penuh</p>
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
                  <PanelHead title="Data seri" />
                  <div className="space-y-3 p-4">
                    <Field label="Judul seri" htmlFor="s-title">
                      <input id="s-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required placeholder="Judul seri" className={inputClass} />
                    </Field>
                    <Field label="Cover" hint={uploadingCover ? "mengunggah…" : coverUrl ? "terunggah" : "wajib"}>
                      <input type="file" accept="image/*" onChange={(e) => void onCoverFile(e.target.files)} className="w-full text-[11px] text-white/45 file:mr-3 file:rounded-md file:border-0 file:bg-white/[.08] file:px-3 file:py-2 file:text-[11px] file:font-bold file:text-white/80" />
                    </Field>
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
                      Saya penerjemah karya ini atau punya izin dari pemegang hak. Pernyataan ini dicatat sebagai bukti.
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
                  <PanelHead title="Data chapter" />
                  <div className="space-y-3 p-4">
                    <Field label="Seri">
                      <select value={chapterSlug} onChange={(e) => setChapterSlug(e.target.value)} required className={inputClass}>
                        <option value="" className="bg-[#14121c]">Pilih seri…</option>
                        {works.map((w) => <option key={w.slug} value={w.slug} className="bg-[#14121c]">{w.title}</option>)}
                      </select>
                    </Field>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="Nomor">
                        <input value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} placeholder="12 / 12.5" inputMode="decimal" required className={inputClass} />
                      </Field>
                      <Field label="Judul">
                        <input value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder="Opsional" className={inputClass} />
                      </Field>
                    </div>
                    <Field label="Gambar" hint={`${chapterImages.length} siap · maks 60`}>
                      <input type="file" accept="image/*" multiple onChange={(e) => void onChapterFiles(e.target.files)} className="w-full text-[11px] text-white/45 file:mr-3 file:rounded-md file:border-0 file:bg-white/[.08] file:px-3 file:py-2 file:text-[11px] file:font-bold file:text-white/80" />
                    </Field>

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
                <Button type="submit" disabled={busyChapter || !chapterSlug || chapterImages.length === 0 || blocked} className="w-full">
                  <FiSend size={13} /> {busyChapter ? "Mengirim…" : "Kirim chapter"}
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
              desc={pendingWorks > 0 ? `${pendingWorks} menunggu review` : "Ketuk project untuk edit atau hapus"}
              right={works.length > 0 ? <Button variant="ghost" onClick={() => { setTab("upload"); setMode("seri"); }}><FiPlus size={12} /> Seri</Button> : undefined}
            />
            {works.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <FiBookOpen size={20} className="mx-auto text-white/20" />
                <p className="mt-2 text-[12px] text-white/35">Belum ada project.</p>
                <Button className="mt-3" onClick={() => { setTab("upload"); setMode("seri"); }}><FiPlus size={12} /> Upload seri</Button>
              </div>
            ) : (
              <ul className="divide-y divide-white/[.05]">
                {works.map((w) => (
                  <li key={w.slug} className="border-b border-white/[.05] last:border-0">
                    <button type="button" onClick={() => void openProject(w.slug)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[.03]">
                      {w.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={w.cover_url} alt="" loading="lazy" className="shrink-0 rounded-[4px] object-cover" style={{ height: 52, width: 36 }} />
                      ) : (
                        <div className="flex shrink-0 items-center justify-center rounded-[4px] bg-white/[.05] text-white/20" style={{ height: 52, width: 36 }}><FiBookOpen size={12} /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-white/90">{w.title}</p>
                        <p className="mt-0.5 text-[10px] text-white/30">{w.type || "—"}{w.is_adult ? " · 18+" : ""}</p>
                        {w.review_status === "rejected" && w.review_note && (
                          <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-rose-300/80">Ditolak: {w.review_note}</p>
                        )}
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold ${w.review_status === "approved" ? "text-emerald-300" : w.review_status === "rejected" ? "text-rose-300" : "text-amber-300"}`}>
                        {w.review_status === "approved" ? "Terbit" : w.review_status === "rejected" ? "Ditolak" : "Review"}
                      </span>
                      <FiChevronDown size={13} className={`shrink-0 text-white/25 transition-transform ${openSlug === w.slug ? "rotate-180" : ""}`} />
                    </button>

                    {openSlug === w.slug && (
                      <div className="border-t border-white/[.05] bg-white/[.015] px-4 py-3">
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
                              <Button variant="danger" onClick={() => void removeProject(w.slug, w.title)}><FiTrash2 size={12} /> Hapus</Button>
                            </div>
                            </div>
                            )}

                            {projectTab === "chapter" && (
                            <div className="pt-1">
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
                    )}
                  </li>
                ))}
              </ul>
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
                <Field label="Nama tim">
                  <input value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={80} className={inputClass} />
                </Field>
                <Field label="Bio">
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={1000} placeholder="Tentang timmu…" className={inputClass} />
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
