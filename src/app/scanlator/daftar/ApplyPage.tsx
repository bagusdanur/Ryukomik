"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FiArrowRight, FiCheckCircle, FiClock, FiFileText, FiMessageCircle, FiSend,
  FiShield, FiUserX, FiXCircle,
} from "react-icons/fi";
import { getSession } from "@/lib/auth/getSession";

type MyApplication = {
  id: string; handle: string; team_name: string; status: string; review_note: string | null; created_at: string;
};

const inputCls = "rk-input w-full rounded-2xl px-4 py-3 text-sm";
const labelCls = "mb-1.5 block text-xs font-bold text-white/70";

/** Apply Akun Translation — gerbang wajib sebelum jadi Scanlator. */
export default function ScanlatorApplyPage() {
  const [handle, setHandle] = useState("");
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [samples, setSamples] = useState("");
  const [wa, setWa] = useState("");
  const [tg, setTg] = useState("");
  const [dc, setDc] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mine, setMine] = useState<MyApplication | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadMine = async () => {
    try {
      const { data } = await getSession();
      const token = data.session?.access_token;
      if (!token) { setNeedLogin(true); return; }
      const res = await fetch("/api/scanlator/apply", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { application?: MyApplication | null };
        setMine(json.application || null);
      }
    } catch {
      setMine(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadMine(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const { data } = await getSession();
      const token = data.session?.access_token;
      if (!token) { setNeedLogin(true); return; }
      const res = await fetch("/api/scanlator/apply", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          handle, team_name: teamName, description,
          samples: samples.split("\n").map((s) => s.trim()).filter(Boolean),
          contact_wa: wa, contact_telegram: tg, contact_discord: dc,
          agree_terms: agree,
        }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Gagal mengajukan. Coba lagi."); return; }
      setHandle(""); setTeamName(""); setDescription(""); setSamples(""); setWa(""); setTg(""); setDc(""); setAgree(false);
      await loadMine();
    } catch {
      setError("Gagal mengajukan. Coba lagi.");
    } finally { setBusy(false); }
  };

  return (
    <main className="rk-page rk-app-surface px-4 pb-24 pt-20 text-white">
      <div className="mx-auto max-w-2xl">
        <header className="rk-social-hero">
          <div className="relative z-10 min-w-0">
            <p className="rk-social-eyebrow">Akun Translation · Beta</p>
            <h1 className="mt-1 text-xl font-black sm:text-2xl">Jadi Scanlator Ryukomik</h1>
            <p className="mt-1.5 max-w-md text-xs leading-relaxed text-white/55">
              Unggah hasil TL-mu, dapat atribusi nama tim, dan pasang tautan donate sendiri.
              Setiap pengajuan diperiksa admin — tidak semua user langsung bisa upload.
            </p>
          </div>
          <span className="relative z-10 hidden shrink-0 rounded-2xl bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white/70 sm:block">Butuh ACC</span>
        </header>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          <StepCard n="1" title="Ajukan" desc="Isi identitas tim & kontak" active={!mine} />
          <StepCard n="2" title="Review admin" desc="Diperiksa manual" active={!!mine && mine.status === "pending"} />
          <StepCard n="3" title="Akses studio" desc="Upload & kelola karya" active={mine?.status === "approved"} />
        </div>

        <div className="mt-4 space-y-4">
          {loading ? (
            <p className="py-10 text-center text-sm" style={{ color: "var(--muted)" }}>Memuat…</p>
          ) : needLogin ? (
            <div className="rk-state rounded-3xl px-5 py-10 text-center">
              <p className="text-sm text-white/60">Login dulu untuk mengajukan Akun Translation.</p>
              <Link href="/" className="rk-btn-primary mt-4 inline-block rounded-full px-5 py-2 text-sm font-bold">Ke Beranda</Link>
            </div>
          ) : (
            <>
              {mine && <StatusCard mine={mine} />}

              {(!mine || mine.status === "rejected") && (
                <form onSubmit={submit} className="rk-card-soft space-y-5 rounded-3xl p-5 sm:p-6">
                  <div>
                    <p className="text-sm font-black text-white">{mine ? "Ajukan ulang" : "Formulir pengajuan"}</p>
                    <p className="mt-0.5 text-[11px] text-white/40">Field bertanda * wajib. Kontak dipakai admin untuk review & pembinaan.</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Nama tim *</label>
                      <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Tim Baca Seru" maxLength={80} required className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Handle *</label>
                      <input value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="tim-baca-seru" maxLength={30} required className={inputCls} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Deskripsi singkat</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} placeholder="Spesialisasi, pengalaman, genre favorit…" className={inputCls} />
                  </div>

                  <div>
                    <label className={labelCls}>Contoh hasil TL * <span className="font-medium text-white/35">satu per baris, maks 3</span></label>
                    <textarea value={samples} onChange={(e) => setSamples(e.target.value)} rows={3} placeholder={"https://…\nChapter 12 — hasil TL tim kami"} className={inputCls} />
                  </div>

                  <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-4">
                    <p className="flex items-center gap-2 text-xs font-black text-white"><FiMessageCircle size={13} className="text-[var(--accent-2)]" /> Kontak admin <span className="font-medium text-white/35">minimal satu</span></p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className={labelCls}>WhatsApp</label>
                        <input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="628…" inputMode="tel" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Telegram</label>
                        <input value={tg} onChange={(e) => setTg(e.target.value)} placeholder="username" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Discord</label>
                        <input value={dc} onChange={(e) => setDc(e.target.value)} placeholder="username" className={inputCls} />
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/35">Hanya dilihat admin, tidak tampil publik.</p>
                  </div>

                  <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl bg-white/[.03] px-4 py-3 text-xs leading-relaxed text-white/60">
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#8b5cf6]" />
                    <span>
                      Aku menyetujui{" "}
                      <Link href="/aturan/scanlator" className="font-semibold text-[var(--accent-2)] underline underline-offset-2">Syarat &amp; Ketentuan Scanlator</Link>{" "}
                      — termasuk hak cipta, kualitas upload, dan sanksi.
                    </span>
                  </label>

                  {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">{error}</p>}

                  <button type="submit" disabled={busy} className="rk-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold disabled:opacity-50">
                    <FiSend size={14} /> {busy ? "Mengirim…" : mine ? "Kirim pengajuan ulang" : "Kirim pengajuan"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function StepCard({ n, title, desc, active }: { n: string; title: string; desc: string; active: boolean }) {
  return (
    <div className={`rounded-2xl border px-3.5 py-3 transition ${active ? "border-[var(--accent)]/40 bg-[var(--accent)]/10" : "border-white/[.06] bg-white/[.02]"}`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${active ? "bg-[var(--accent)] text-white" : "bg-white/10 text-white/50"}`}>{n}</span>
        <p className={`text-xs font-black ${active ? "text-white" : "text-white/60"}`}>{title}</p>
      </div>
      <p className="mt-1 pl-7 text-[11px] text-white/35">{desc}</p>
    </div>
  );
}

function StatusCard({ mine }: { mine: MyApplication }) {
  const approved = mine.status === "approved";
  const rejected = mine.status === "rejected";
  return (
    <div className="rk-card-soft rounded-3xl p-5">
      <div className="flex items-start gap-3">
        {approved ? <FiCheckCircle size={20} className="mt-0.5 shrink-0 text-emerald-300" />
          : rejected ? <FiUserX size={20} className="mt-0.5 shrink-0 text-rose-300" />
          : <FiClock size={20} className="mt-0.5 shrink-0 text-amber-300" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">
            {approved ? "Akun Translation aktif" : rejected ? "Pengajuan ditolak" : "Menunggu review admin"}
          </p>
          <p className="mt-0.5 text-xs text-white/45">{mine.team_name} · @{mine.handle} · {new Date(mine.created_at).toLocaleDateString("id-ID")}</p>
          {mine.review_note && <p className="mt-2 rounded-xl bg-white/[.04] px-3 py-2 text-xs leading-relaxed text-white/65">Catatan admin: {mine.review_note}</p>}
          {rejected && <p className="mt-2 text-xs leading-relaxed text-white/45">Perbaiki sesuai catatan lalu ajukan ulang lewat formulir di bawah.</p>}
        </div>
      </div>
      {approved && (
        <Link href="/scanlator" className="rk-btn-primary mt-4 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold">
          Buka Studio Scanlator <FiArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
