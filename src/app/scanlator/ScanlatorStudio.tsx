"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FiBookOpen, FiClock, FiEdit3, FiHeart, FiImage, FiSave, FiSend, FiUser } from "react-icons/fi";
import { getSession } from "@/lib/auth/getSession";

const inputCls = "rk-input w-full rounded-2xl px-4 py-3 text-sm";

type Profile = {
  handle: string; team_name: string; bio: string | null;
  support_dana: string | null; support_trakteer: string | null; support_tako: string | null; support_url_lain: string | null;
};

type Work = {
  slug: string; title: string; cover_url: string | null; type: string | null;
  review_status: string | null; is_published: boolean; is_adult: boolean;
};

/**
 * Studio Scanlator (BETA) — profil, link donate, upload karya, daftar karya.
 * Desain mengikuti globals.css (rk-card / rk-card-soft / rk-chip).
 */
export default function ScanlatorStudio() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [needLogin, setNeedLogin] = useState(false);
  const [notScanlator, setNotScanlator] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [bio, setBio] = useState("");
  const [dana, setDana] = useState("");
  const [trakteer, setTrakteer] = useState("");
  const [tako, setTako] = useState("");
  const [lain, setLain] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Manhwa");
  const [genres, setGenres] = useState("");
  const [isAdult, setIsAdult] = useState(false);
  const [busySeries, setBusySeries] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

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
          setProfile(json.profile);
          setBio(json.profile.bio || "");
          setDana(json.profile.support_dana || "");
          setTrakteer(json.profile.support_trakteer || "");
          setTako(json.profile.support_tako || "");
          setLain(json.profile.support_url_lain || "");
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
        body: JSON.stringify({ bio, support_dana: dana, support_trakteer: trakteer, support_tako: tako, support_url_lain: lain }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Gagal menyimpan."); return; }
      setNotice("Profil & tautan donate tersimpan.");
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
            Studio ini hanya untuk akun yang sudah ACC. Ajukan Akun Translation dulu — setiap pengajuan diperiksa admin manual.
          </p>
          <Link href="/scanlator/daftar" className="rk-btn-primary mt-5 inline-block rounded-full px-5 py-2.5 text-sm font-bold">Ajukan Akun Translation</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="rk-page rk-app-surface px-4 pb-24 pt-20 text-white">
      <div className="mx-auto max-w-2xl">
        <header className="rk-card rounded-3xl p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rk-chip rounded-full px-3 py-1 text-[11px] font-black">STUDIO SCANLATOR</span>
            <span className="rk-chip rounded-full px-3 py-1 text-[11px] font-black">BETA</span>
          </div>
          <h1 className="mt-3 text-2xl font-black">
            {profile.team_name} <span className="text-base font-semibold text-white/40">@{profile.handle}</span>
          </h1>
          <p className="mt-1 text-sm text-white/55">Kelola profil, tautan donate, dan karya TL-mu. Karya baru menunggu ACC admin sebelum terbit.</p>
        </header>

        {(notice || error) && (
          <p className={`mt-4 rounded-2xl px-4 py-3 text-xs font-semibold ${error ? "bg-rose-500/10 text-rose-200" : "bg-emerald-500/10 text-emerald-200"}`}>
            {error || notice}
          </p>
        )}

        <div className="mt-4 space-y-4">
          <form onSubmit={saveProfile} className="rk-card-soft space-y-4 rounded-3xl p-5 sm:p-6">
            <SectionTitle icon={<FiUser size={15} />} text="Profil & tautan donate" />
            <Field label="Bio tim">
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={1000} placeholder="Bio tim kamu…" className={inputCls} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <DonateField label="DANA / GoPay" value={dana} setValue={setDana} placeholder="https://dana.link/…" />
              <DonateField label="Trakteer" value={trakteer} setValue={setTrakteer} placeholder="https://trakteer.id/…" />
              <DonateField label="Tako" value={tako} setValue={setTako} placeholder="https://tako.id/…" />
              <DonateField label="Link lain" value={lain} setValue={setLain} placeholder="https://…" />
            </div>
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/40">
              <FiHeart size={13} className="mt-0.5 shrink-0" />
              Tautan ini tampil di blok “Dukung kami!” pada halaman detail karyamu. Uang langsung masuk ke akunmu — Ryukomik tidak pegang dana.
            </p>
            <button type="submit" disabled={savingProfile} className="rk-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold disabled:opacity-50">
              <FiSave size={14} /> {savingProfile ? "Menyimpan…" : "Simpan profil"}
            </button>
          </form>

          <form onSubmit={createSeries} className="rk-card-soft space-y-4 rounded-3xl p-5 sm:p-6">
            <SectionTitle icon={<FiBookOpen size={15} />} text="Upload seri baru" />
            <Field label="Judul seri">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul seri" maxLength={200} required className={inputCls} />
            </Field>
            <Field label={`Cover ${uploadingCover ? "(mengunggah…)" : ""}`}>
              <input type="file" accept="image/*" onChange={(e) => void onCoverFile(e.target.files)} className="w-full text-xs text-white/60" />
              {coverUrl && <p className="mt-1.5 text-[11px] font-semibold text-emerald-300">Cover terunggah ✓</p>}
            </Field>
            <Field label="Deskripsi">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={3000} placeholder="Deskripsi seri…" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
                  {["Manhwa", "Manhua", "Manga", "Novel"].map((t) => <option key={t} value={t} className="bg-[#14121c]">{t}</option>)}
                </select>
              </Field>
              <Field label="Genre">
                <input value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="Aksi, Fantasi" className={inputCls} />
              </Field>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl bg-white/[.03] px-4 py-3 text-xs text-white/60">
              <input type="checkbox" checked={isAdult} onChange={(e) => setIsAdult(e.target.checked)} className="h-4 w-4 shrink-0 accent-[#8b5cf6]" />
              Konten 18+ — satu-satunya penentu filter (genre tidak berpengaruh)
            </label>
            <button type="submit" disabled={busySeries || !coverUrl} className="rk-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold disabled:opacity-50">
              <FiSend size={14} /> {busySeries ? "Mengirim…" : "Kirim untuk direview"}
            </button>
          </form>

          <form onSubmit={createChapter} className="rk-card-soft space-y-4 rounded-3xl p-5 sm:p-6">
            <SectionTitle icon={<FiBookOpen size={15} />} text="Upload chapter" />
            <Field label="Seri">
              <select value={chapterSlug} onChange={(e) => setChapterSlug(e.target.value)} required className={inputCls}>
                <option value="" className="bg-[#14121c]">Pilih seri kamu…</option>
                {works.map((w) => <option key={w.slug} value={w.slug} className="bg-[#14121c]">{w.title}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nomor chapter">
                <input value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} placeholder="12 / 12.5" inputMode="decimal" required className={inputCls} />
              </Field>
              <Field label="Judul chapter">
                <input value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder="Bebas" className={inputCls} />
              </Field>
            </div>
            <Field label={`Gambar chapter ${uploadingChapter ? "(mengunggah…)" : ""}`} hint="bisa banyak sekaligus">
              <input type="file" accept="image/*" multiple onChange={(e) => void onChapterFiles(e.target.files)} className="w-full text-xs text-white/60" />
              <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
                {chapterImages.length} gambar terunggah · halaman terakhir otomatis diberi watermark nama tim · maks 30 MB/gambar, maks 60 gambar/chapter.
              </p>
            </Field>
            <button type="submit" disabled={busyChapter || !chapterSlug || chapterImages.length === 0} className="rk-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold disabled:opacity-50">
              <FiSend size={14} /> {busyChapter ? "Mengirim…" : "Kirim chapter"}
            </button>
          </form>

          <section className="rk-card-soft rounded-3xl p-5 sm:p-6">
            <SectionTitle icon={<FiEdit3 size={15} />} text={`Karya saya (${works.length})`} />
            <div className="mt-3 space-y-2">
              {works.map((w) => (
                <div key={w.slug} className="flex items-center gap-3 rounded-2xl bg-white/[.03] p-3">
                  {w.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.cover_url} alt="" className="h-14 w-10 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[.06] text-white/30"><FiBookOpen size={14} /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{w.title}</p>
                    <p className="text-[11px] text-white/40">{w.type || "—"}{w.is_adult ? " · 18+" : ""}</p>
                  </div>
                  <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${w.review_status === "approved" ? "bg-emerald-500/10 text-emerald-300" : w.review_status === "rejected" ? "bg-rose-500/10 text-rose-300" : "bg-amber-500/10 text-amber-300"}`}>
                    <FiClock size={10} /> {w.review_status === "approved" ? "Terbit" : w.review_status === "rejected" ? "Ditolak" : "Review"}
                  </span>
                </div>
              ))}
              {works.length === 0 && <p className="py-6 text-center text-xs text-white/40">Belum ada karya. Upload seri pertamamu di atas.</p>}
            </div>
            <Link href={`/scanlator/${profile.handle}`} className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-white/10 py-2.5 text-xs font-bold text-white/70 transition hover:text-white">
              <FiImage size={13} /> Lihat halaman publik tim kamu
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}

function SectionTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <p className="flex items-center gap-2 text-sm font-black text-white">
      <span className="text-[var(--accent-2)]">{icon}</span> {text}
    </p>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-white/70">
        {label}
        {hint && <span className="ml-2 font-medium text-white/35">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function DonateField({ label, value, setValue, placeholder }: { label: string; value: string; setValue: (v: string) => void; placeholder: string }) {
  return (
    <Field label={label}>
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className={inputCls} />
    </Field>
  );
}
