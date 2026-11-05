"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FiAlertTriangle, FiBookOpen, FiCheckCircle, FiClock, FiEdit3, FiHeart, FiImage,
  FiLayout, FiSave, FiSend, FiShield, FiUploadCloud, FiUser, FiXCircle,
} from "react-icons/fi";
import { getSession } from "@/lib/auth/getSession";

const inputCls = "rk-input w-full rounded-2xl px-4 py-3 text-sm";
const labelCls = "mb-1.5 block text-xs font-bold text-white/70";

type Profile = {
  handle: string; team_name: string; bio: string | null;
  support_dana: string | null; support_trakteer: string | null; support_tako: string | null; support_url_lain: string | null;
  contact_wa: string | null; contact_telegram: string | null; contact_discord: string | null;
  status: "active" | "suspended" | "revoked";
  warnings: number; suspended_until: string | null; moderation_note: string | null;
};

type Work = {
  slug: string; title: string; cover_url: string | null; type: string | null;
  review_status: string | null; is_published: boolean; is_adult: boolean;
};

type TabId = "ringkasan" | "upload" | "karya" | "profil";

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: "ringkasan", label: "Ringkasan", icon: <FiLayout size={14} /> },
  { id: "upload", label: "Upload", icon: <FiUploadCloud size={14} /> },
  { id: "karya", label: "Karya", icon: <FiBookOpen size={14} /> },
  { id: "profil", label: "Profil & Donate", icon: <FiUser size={14} /> },
];

/** Studio Scanlator (BETA) — tabbed: Ringkasan, Upload, Karya, Profil. */
export default function ScanlatorStudio() {
  const [tab, setTab] = useState<TabId>("ringkasan");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [needLogin, setNeedLogin] = useState(false);
  const [notScanlator, setNotScanlator] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // profil
  const [teamName, setTeamName] = useState("");
  const [bio, setBio] = useState("");
  const [dana, setDana] = useState("");
  const [trakteer, setTrakteer] = useState("");
  const [tako, setTako] = useState("");
  const [lain, setLain] = useState("");
  const [cWa, setCWa] = useState("");
  const [cTg, setCTg] = useState("");
  const [cDc, setCDc] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // seri
  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Manhwa");
  const [genres, setGenres] = useState("");
  const [isAdult, setIsAdult] = useState(false);
  const [busySeries, setBusySeries] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // chapter
  const [chapterSlug, setChapterSlug] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterImages, setChapterImages] = useState<string[]>([]);
  const [uploadingChapter, setUploadingChapter] = useState(false);
  const [busyChapter, setBusyChapter] = useState(false);

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
          setBio(p.bio || "");
          setDana(p.support_dana || "");
          setTrakteer(p.support_trakteer || "");
          setTako(p.support_tako || "");
          setLain(p.support_url_lain || "");
          setCWa(p.contact_wa || "");
          setCTg(p.contact_telegram || "");
          setCDc(p.contact_discord || "");
        }
      }
      if (wRes.ok) {
        const json = (await wRes.json()) as { works?: Work[] };
        setWorks(json.works || []);
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
          team_name: teamName, bio,
          support_dana: dana, support_trakteer: trakteer, support_tako: tako, support_url_lain: lain,
          contact_wa: cWa, contact_telegram: cTg, contact_discord: cDc,
        }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Gagal menyimpan."); return; }
      setNotice("Perubahan tersimpan.");
      await load();
    } finally { setSavingProfile(false); }
  };

  const uploadImage = async (file: File, kind: "cover" | "chapter", slug: string, watermark: boolean) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    fd.append("slug", slug);
    if (watermark) fd.append("watermark", "true");
    const t = await token();
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
          genres: genres.split(",").map((g) => g.trim()).filter(Boolean),
        }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Gagal membuat seri."); return; }
      setNotice("Seri dibuat — menunggu ACC admin sebelum terbit.");
      setTitle(""); setCoverUrl(""); setDescription(""); setGenres(""); setIsAdult(false);
      await load();
    } finally { setBusySeries(false); }
  };

  const onCoverFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploadingCover(true); setError("");
    try {
      setCoverUrl(await uploadImage(file, "cover", profile?.handle || "cover", false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload cover gagal.");
    } finally { setUploadingCover(false); }
  };

  const onChapterFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    setUploadingChapter(true); setError("");
    try {
      const urls: string[] = [];
      for (let i = 0; i < list.length; i++) {
        urls.push(await uploadImage(list[i], "chapter", chapterSlug || profile?.handle || "chapter", i === list.length - 1));
      }
      setChapterImages((prev) => [...prev, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload chapter gagal.");
    } finally { setUploadingChapter(false); }
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
      setNotice(`Chapter ${chapterNumber} terkirim — ikut terbit setelah seri disetujui admin.`);
      setChapterNumber(""); setChapterTitle(""); setChapterImages([]);
    } finally { setBusyChapter(false); }
  };

  if (loading) {
    return (
      <main className="rk-page rk-app-surface px-4 pb-24 pt-20 text-white">
        <p className="py-16 text-center text-sm" style={{ color: "var(--muted)" }}>Memuat studio…</p>
      </main>
    );
  }

  if (needLogin) {
    return (
      <main className="rk-page rk-app-surface px-4 pb-24 pt-20 text-white">
        <div className="rk-state mx-auto max-w-md rounded-3xl px-5 py-12 text-center">
          <p className="text-sm text-white/60">Login dulu untuk membuka Studio Scanlator.</p>
          <Link href="/" className="rk-btn-primary mt-4 inline-block rounded-full px-5 py-2 text-sm font-bold">Ke Beranda</Link>
        </div>
      </main>
    );
  }

  if (notScanlator || !profile) {
    return (
      <main className="rk-page rk-app-surface px-4 pb-24 pt-20 text-white">
        <div className="rk-card mx-auto max-w-md rounded-3xl p-6 text-center">
          <span className="rk-chip rounded-full px-3 py-1 text-[11px] font-black">BETA</span>
          <h1 className="mt-3 text-xl font-black">Belum jadi Scanlator</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            Studio ini hanya untuk akun yang sudah ACC. Ajukan Akun Translation dulu — pengajuan diperiksa admin manual.
          </p>
          <Link href="/scanlator/daftar" className="rk-btn-primary mt-5 inline-block rounded-full px-5 py-2.5 text-sm font-bold">Ajukan Akun Translation</Link>
        </div>
      </main>
    );
  }

  const published = works.filter((w) => w.review_status === "approved").length;
  const pendingWorks = works.filter((w) => w.review_status === "pending").length;
  const suspended = profile.status === "suspended";
  const revoked = profile.status === "revoked";

  return (
    <main className="rk-page rk-app-surface px-4 pb-24 pt-20 text-white">
      <div className="mx-auto max-w-3xl">
        {/* HERO */}
        <header className="rk-social-hero">
          <div className="relative z-10 flex min-w-0 items-center gap-3.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl rk-gradient text-xl font-black text-white">
              {profile.team_name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="rk-social-eyebrow">Studio Scanlator · Beta</p>
              <h1 className="truncate text-lg font-black leading-tight sm:text-xl">{profile.team_name}</h1>
              <p className="truncate text-[11px] text-white/45">@{profile.handle}</p>
            </div>
          </div>
          <div className="relative z-10 flex shrink-0 flex-col items-end gap-1.5">
            <StatusChip status={profile.status} />
            {profile.warnings > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-200">
                <FiAlertTriangle size={10} /> {profile.warnings} SP
              </span>
            )}
          </div>
        </header>

        {/* TAB BAR */}
        <nav className="mt-4 flex gap-1.5 overflow-x-auto rounded-2xl border border-white/[.06] bg-white/[.03] p-1.5 [scrollbar-width:none]">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTab(t.id); setError(""); setNotice(""); }}
                className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-[12px] font-bold transition ${
                  active ? "bg-[var(--accent)] text-white shadow-[0_6px_18px_rgba(139,92,246,.35)]" : "text-white/50 hover:bg-white/[.05] hover:text-white/80"
                }`}
              >
                {t.icon} {t.label}
              </button>
            );
          })}
        </nav>

        {(notice || error) && (
          <p className={`mt-4 rounded-2xl px-4 py-3 text-xs font-semibold ${error ? "bg-rose-500/10 text-rose-200" : "bg-emerald-500/10 text-emerald-200"}`}>
            {error || notice}
          </p>
        )}

        {(suspended || revoked) && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/[.07] px-4 py-3">
            <FiAlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" />
            <div className="min-w-0 text-xs leading-relaxed text-amber-100/85">
              <p className="font-bold">{revoked ? "Akses Scanlator dicabut" : "Akun sedang disuspend"}</p>
              <p className="mt-0.5 text-amber-100/60">
                {revoked
                  ? "Kamu tidak bisa upload atau mengubah karya. Hubungi admin untuk banding."
                  : `Upload dibekukan${profile.suspended_until ? ` sampai ${new Date(profile.suspended_until).toLocaleDateString("id-ID")}` : ""}. Hubungi admin.`}
              </p>
              {profile.moderation_note && <p className="mt-1 text-amber-100/50">Catatan admin: {profile.moderation_note}</p>}
            </div>
          </div>
        )}

        <div className="mt-4">
          {tab === "ringkasan" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2.5">
                <StatCard label="Karya" value={works.length} icon={<FiBookOpen size={14} />} />
                <StatCard label="Terbit" value={published} icon={<FiCheckCircle size={14} />} accent="emerald" />
                <StatCard label="Menunggu" value={pendingWorks} icon={<FiClock size={14} />} accent="amber" />
              </div>

              <div className="rk-card-soft rounded-3xl p-5">
                <SectionTitle icon={<FiLayout size={15} />} text="Alur kerja Scanlator" />
                <ol className="mt-3 space-y-2.5">
                  {[
                    "Ajukan Akun Translation (sekali) → admin ACC.",
                    "Upload seri: judul, cover, genre, toggle 18+.",
                    "Upload chapter: gambar banyak sekaligus, watermark otomatis di halaman terakhir.",
                    "Admin review → seri + chapter terbit, atribusi namamu tampil di halaman seri.",
                    "Tautan donate tampil di blok “Dukung kami!” pada seri milikmu.",
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3 text-[13px] leading-relaxed text-white/60">
                      <span className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[10px] font-black text-[var(--accent-2)]">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rk-card-soft rounded-3xl p-5">
                <SectionTitle icon={<FiShield size={15} />} text="Kontak admin" />
                <p className="mt-2 text-xs leading-relaxed text-white/50">
                  Punya pertanyaan soal review, sanksi, atau takedown? Hubungi admin lewat kontak resmi Ryukomik.
                  Pastikan kontak Telegram/Discord kamu terisi di tab Profil supaya admin bisa menghubungi.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/aturan/scanlator" className="rounded-xl bg-white/[.05] px-3.5 py-2 text-[11px] font-bold text-white/75 transition hover:bg-white/[.09]">Baca S&amp;K Scanlator</Link>
                  <Link href={`/scanlator/${profile.handle}`} className="rounded-xl bg-white/[.05] px-3.5 py-2 text-[11px] font-bold text-white/75 transition hover:bg-white/[.09]">Halaman publik tim</Link>
                </div>
              </div>
            </div>
          )}

          {tab === "upload" && (
            <div className="space-y-4">
              <form onSubmit={createSeries} className="rk-card-soft space-y-4 rounded-3xl p-5">
                <SectionTitle icon={<FiBookOpen size={15} />} text="Upload seri baru" />
                <div>
                  <label className={labelCls}>Judul seri</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul seri" maxLength={200} required className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Cover {uploadingCover && <span className="font-medium text-[var(--accent-2)]">mengunggah…</span>}</label>
                  <input type="file" accept="image/*" onChange={(e) => void onCoverFile(e.target.files)} className="w-full text-xs text-white/60" />
                  {coverUrl && <p className="mt-1.5 text-[11px] font-semibold text-emerald-300">Cover terunggah ✓</p>}
                </div>
                <div>
                  <label className={labelCls}>Deskripsi</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={3000} placeholder="Deskripsi seri…" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Type</label>
                    <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
                      {["Manhwa", "Manhua", "Manga", "Novel"].map((t) => <option key={t} value={t} className="bg-[#14121c]">{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Genre</label>
                    <input value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="Aksi, Fantasi" className={inputCls} />
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl bg-white/[.03] px-4 py-3 text-xs text-white/60">
                  <input type="checkbox" checked={isAdult} onChange={(e) => setIsAdult(e.target.checked)} className="h-4 w-4 shrink-0 accent-[#8b5cf6]" />
                  Konten 18+ — penentu filter (genre tidak berpengaruh)
                </label>
                <button type="submit" disabled={busySeries || !coverUrl || suspended || revoked} className="rk-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold disabled:opacity-50">
                  <FiSend size={14} /> {busySeries ? "Mengirim…" : "Kirim untuk direview"}
                </button>
              </form>

              <form onSubmit={createChapter} className="rk-card-soft space-y-4 rounded-3xl p-5">
                <SectionTitle icon={<FiImage size={15} />} text="Upload chapter" />
                <div>
                  <label className={labelCls}>Seri</label>
                  <select value={chapterSlug} onChange={(e) => setChapterSlug(e.target.value)} required className={inputCls}>
                    <option value="" className="bg-[#14121c]">Pilih seri kamu…</option>
                    {works.map((w) => <option key={w.slug} value={w.slug} className="bg-[#14121c]">{w.title}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nomor</label>
                    <input value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} placeholder="12 / 12.5" inputMode="decimal" required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Judul</label>
                    <input value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder="Bebas" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Gambar {uploadingChapter && <span className="font-medium text-[var(--accent-2)]">mengunggah…</span>}</label>
                  <input type="file" accept="image/*" multiple onChange={(e) => void onChapterFiles(e.target.files)} className="w-full text-xs text-white/60" />
                  <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
                    {chapterImages.length} gambar terunggah · watermark otomatis di halaman terakhir · maks 30 MB/gambar, 60 gambar/chapter.
                  </p>
                </div>
                <button type="submit" disabled={busyChapter || !chapterSlug || chapterImages.length === 0 || suspended || revoked} className="rk-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold disabled:opacity-50">
                  <FiSend size={14} /> {busyChapter ? "Mengirim…" : "Kirim chapter"}
                </button>
              </form>
            </div>
          )}

          {tab === "karya" && (
            <div className="rk-card-soft rounded-3xl p-5">
              <SectionTitle icon={<FiEdit3 size={15} />} text={`Karya saya (${works.length})`} />
              <div className="mt-3 space-y-2">
                {works.map((w) => (
                  <div key={w.slug} className="flex items-center gap-3 rounded-2xl bg-white/[.03] p-3">
                    {w.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={w.cover_url} alt="" className="h-16 w-11 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded-lg bg-white/[.06] text-white/30"><FiBookOpen size={14} /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{w.title}</p>
                      <p className="text-[11px] text-white/40">{w.type || "—"}{w.is_adult ? " · 18+" : ""}</p>
                    </div>
                    <ReviewChip status={w.review_status} />
                  </div>
                ))}
                {works.length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-xs text-white/40">Belum ada karya.</p>
                    <button type="button" onClick={() => setTab("upload")} className="rk-btn-primary mt-3 rounded-full px-4 py-2 text-xs font-bold">Upload seri pertama</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "profil" && (
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="rk-card-soft space-y-4 rounded-3xl p-5">
                <SectionTitle icon={<FiUser size={15} />} text="Identitas tim" />
                <div>
                  <label className={labelCls}>Nama tim</label>
                  <input value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={80} className={inputCls} />
                  <p className="mt-1 text-[11px] text-white/35">Handle @{profile.handle} tidak bisa diubah sendiri — hubungi admin bila perlu.</p>
                </div>
                <div>
                  <label className={labelCls}>Bio</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={1000} placeholder="Bio tim kamu…" className={inputCls} />
                </div>
              </div>

              <div className="rk-card-soft space-y-4 rounded-3xl p-5">
                <SectionTitle icon={<FiShield size={15} />} text="Kontak" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>WhatsApp</label>
                    <input value={cWa} onChange={(e) => setCWa(e.target.value)} placeholder="6281234567890" inputMode="tel" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Telegram</label>
                    <input value={cTg} onChange={(e) => setCTg(e.target.value)} placeholder="username" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Discord</label>
                    <input value={cDc} onChange={(e) => setCDc(e.target.value)} placeholder="username" className={inputCls} />
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-white/40">Kontak hanya dilihat admin, tidak tampil publik. Dipakai untuk review, peringatan, dan takedown.</p>
              </div>

              <div className="rk-card-soft space-y-4 rounded-3xl p-5">
                <SectionTitle icon={<FiHeart size={15} />} text="Tautan donate" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className={labelCls}>DANA / GoPay</label><input value={dana} onChange={(e) => setDana(e.target.value)} placeholder="https://dana.link/…" className={inputCls} /></div>
                  <div><label className={labelCls}>Trakteer</label><input value={trakteer} onChange={(e) => setTrakteer(e.target.value)} placeholder="https://trakteer.id/…" className={inputCls} /></div>
                  <div><label className={labelCls}>Tako</label><input value={tako} onChange={(e) => setTako(e.target.value)} placeholder="https://tako.id/…" className={inputCls} /></div>
                  <div><label className={labelCls}>Link lain</label><input value={lain} onChange={(e) => setLain(e.target.value)} placeholder="https://…" className={inputCls} /></div>
                </div>
                <p className="text-[11px] leading-relaxed text-white/40">Tampil di blok “Dukung kami!” pada seri milikmu. Uang langsung ke akunmu — Ryukomik tidak pegang dana.</p>
              </div>

              <button type="submit" disabled={savingProfile} className="rk-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold disabled:opacity-50">
                <FiSave size={14} /> {savingProfile ? "Menyimpan…" : "Simpan perubahan"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Aktif", cls: "bg-emerald-500/15 text-emerald-200" },
    suspended: { label: "Suspend", cls: "bg-amber-500/15 text-amber-200" },
    revoked: { label: "Dicabut", cls: "bg-rose-500/15 text-rose-200" },
  };
  const s = map[status] || map.active;
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${s.cls}`}>{s.label}</span>;
}

function ReviewChip({ status }: { status: string | null }) {
  if (status === "approved") {
    return <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300"><FiCheckCircle size={10} /> Terbit</span>;
  }
  if (status === "rejected") {
    return <span className="flex shrink-0 items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-300"><FiXCircle size={10} /> Ditolak</span>;
  }
  return <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-300"><FiClock size={10} /> Review</span>;
}

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: "emerald" | "amber" }) {
  const color = accent === "emerald" ? "text-emerald-300" : accent === "amber" ? "text-amber-300" : "text-[var(--accent-2)]";
  return (
    <div className="rk-card-soft rounded-2xl px-3 py-3">
      <span className={color}>{icon}</span>
      <p className="mt-1.5 text-xl font-black leading-none text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/35">{label}</p>
    </div>
  );
}

function SectionTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <p className="flex items-center gap-2 text-sm font-black text-white">
      <span className="text-[var(--accent-2)]">{icon}</span> {text}
    </p>
  );
}
