"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FiAlertTriangle, FiArrowRight, FiBookOpen, FiClock, FiEdit3, FiImage,
  FiPlus, FiSend, FiUser,
} from "react-icons/fi";
import { getSession } from "@/lib/auth/getSession";
import { Button, Field, Panel, PanelHead, Row, Stat, StatusDot, Tabs, inputClass } from "@/components/scanlator/ui";

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

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "ringkasan", label: "Ringkasan" },
  { id: "upload", label: "Upload" },
  { id: "karya", label: "Karya" },
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
  const [mode, setMode] = useState<"seri" | "chapter">("seri");

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
      if (wRes.ok) setWorks(((await wRes.json()) as { works?: Work[] }).works || []);
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
      setNotice("Seri terkirim — menunggu review admin.");
      setTitle(""); setCoverUrl(""); setDescription(""); setGenres(""); setIsAdult(false);
      await load();
    } finally { setBusySeries(false); }
  };

  const onCoverFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploadingCover(true); setError("");
    try { setCoverUrl(await uploadImage(file, "cover", profile?.handle || "cover", false)); }
    catch (err) { setError(err instanceof Error ? err.message : "Upload cover gagal."); }
    finally { setUploadingCover(false); }
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
    } catch (err) { setError(err instanceof Error ? err.message : "Upload chapter gagal."); }
    finally { setUploadingChapter(false); }
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
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/[.08] bg-white/[.04] text-base font-bold text-white/80">
          {profile.team_name.slice(0, 1).toUpperCase()}
        </div>
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
              {profile.status === "revoked" ? "Tidak bisa upload. Hubungi admin untuk banding." : `Upload dibekukan${profile.suspended_until ? ` s.d. ${new Date(profile.suspended_until).toLocaleDateString("id-ID")}` : ""}.`}
            </p>
          </div>
        </div>
      )}

      <div className="pt-4">
        {tab === "ringkasan" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Karya" value={works.length} />
              <Stat label="Terbit" value={published} tone="ok" />
              <Stat label="Review" value={pendingWorks} tone="warn" />
            </div>

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
                <span className="text-[12px] text-white/60">Halaman publik tim</span>
                <Link href={`/scanlator/${profile.handle}`} className="flex items-center gap-1 text-[11px] font-bold text-[var(--accent-2)]">Lihat <FiArrowRight size={11} /></Link>
              </Row>
            </Panel>
          </div>
        )}

        {tab === "upload" && (
          <div className="space-y-3">
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
                  </div>
                </Panel>
                <Button type="submit" disabled={busySeries || !coverUrl || blocked} className="w-full">
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
                    <Field label="Gambar" hint={uploadingChapter ? "mengunggah…" : `${chapterImages.length} file`}>
                      <input type="file" accept="image/*" multiple onChange={(e) => void onChapterFiles(e.target.files)} className="w-full text-[11px] text-white/45 file:mr-3 file:rounded-md file:border-0 file:bg-white/[.08] file:px-3 file:py-2 file:text-[11px] file:font-bold file:text-white/80" />
                    </Field>
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
          <Panel>
            <PanelHead
              title={`Karya (${works.length})`}
              desc={pendingWorks > 0 ? `${pendingWorks} menunggu review` : undefined}
              right={works.length > 0 ? <Button variant="ghost" onClick={() => { setTab("upload"); setMode("seri"); }}><FiPlus size={12} /> Seri</Button> : undefined}
            />
            {works.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <FiBookOpen size={20} className="mx-auto text-white/20" />
                <p className="mt-2 text-[12px] text-white/35">Belum ada karya.</p>
                <Button className="mt-3" onClick={() => { setTab("upload"); setMode("seri"); }}><FiPlus size={12} /> Upload seri</Button>
              </div>
            ) : (
              <ul className="divide-y divide-white/[.05]">
                {works.map((w) => (
                  <li key={w.slug} className="flex items-center gap-3 px-4 py-2.5">
                    {w.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={w.cover_url} alt="" loading="lazy" className="h-13 w-9 shrink-0 rounded-[4px] object-cover" style={{ height: 52, width: 36 }} />
                    ) : (
                      <div className="flex shrink-0 items-center justify-center rounded-[4px] bg-white/[.05] text-white/20" style={{ height: 52, width: 36 }}><FiBookOpen size={12} /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-white/90">{w.title}</p>
                      <p className="mt-0.5 text-[10px] text-white/30">{w.type || "—"}{w.is_adult ? " · 18+" : ""}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold ${w.review_status === "approved" ? "text-emerald-300" : w.review_status === "rejected" ? "text-rose-300" : "text-amber-300"}`}>
                      {w.review_status === "approved" ? "Terbit" : w.review_status === "rejected" ? "Ditolak" : "Review"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {tab === "profil" && (
          <form onSubmit={saveProfile} className="space-y-3">
            <Panel>
              <PanelHead title="Identitas" desc={`Handle @${profile.handle} tidak bisa diubah.`} />
              <div className="space-y-3 p-4">
                <Field label="Nama tim">
                  <input value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={80} className={inputClass} />
                </Field>
                <Field label="Bio">
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={1000} placeholder="Tentang timmu…" className={inputClass} />
                </Field>
              </div>
            </Panel>

            <Panel>
              <PanelHead title="Kontak admin" desc="Tidak tampil publik." />
              <div className="space-y-3 p-4">
                <Field label="WhatsApp"><input value={cWa} onChange={(e) => setCWa(e.target.value)} placeholder="628…" inputMode="tel" className={inputClass} /></Field>
                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="Telegram"><input value={cTg} onChange={(e) => setCTg(e.target.value)} placeholder="username" className={inputClass} /></Field>
                  <Field label="Discord"><input value={cDc} onChange={(e) => setCDc(e.target.value)} placeholder="username" className={inputClass} /></Field>
                </div>
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
    </>,
  );
}
