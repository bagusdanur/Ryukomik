"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiCheckCircle, FiClock, FiSend, FiShield, FiXCircle } from "react-icons/fi";
import { getSession } from "@/lib/auth/getSession";

type MyApplication = {
  id: string;
  handle: string;
  team_name: string;
  status: string;
  review_note: string | null;
  created_at: string;
};

/**
 * Halaman Apply Request Akun Translation (Fase A Scanlator — BETA).
 * Pengajuan wajib ACC admin manual; tanpa itu tidak ada akses upload.
 */
export default function ScanlatorApplyPage() {
  const [handle, setHandle] = useState("");
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [samples, setSamples] = useState("");
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
      if (!token) {
        setNeedLogin(true);
        return;
      }
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

  useEffect(() => {
    void loadMine();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await getSession();
      const token = data.session?.access_token;
      if (!token) {
        setNeedLogin(true);
        return;
      }
      const res = await fetch("/api/scanlator/apply", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          handle,
          team_name: teamName,
          description,
          samples: samples.split("\n").map((s) => s.trim()).filter(Boolean),
          agree_terms: agree,
        }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; status?: string; error?: string } | null;
      if (!res.ok || !json?.success) {
        setError(json?.error || "Gagal mengajukan. Coba lagi.");
        return;
      }
      await loadMine();
    } catch {
      setError("Gagal mengajukan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="rk-page rk-app-surface px-4 pb-24 pt-20 text-white">
      <div className="mx-auto max-w-xl space-y-4">
        <header className="rk-card rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rk-chip rounded-full px-3 py-1 text-[11px] font-black">BETA</span>
            <span className="text-[11px] text-white/45">Fase A — identitas & pengajuan, upload menyusul</span>
          </div>
          <h1 className="mt-3 text-2xl font-black">Daftar Akun Translation (Scanlator)</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Ini gerbang wajib sebelum bisa mengunggah hasil TL. Setiap pengajuan diperiksa admin manual —
            tidak semua user bisa langsung upload. Sudah ada akun? Status pengajuanmu tampil di bawah.
          </p>
        </header>

        {loading ? (
          <p className="py-10 text-center text-sm" style={{ color: "var(--muted)" }}>Memuat…</p>
        ) : needLogin ? (
          <div className="rk-state rounded-3xl px-5 py-10 text-center">
            <p className="text-sm" style={{ color: "var(--muted)" }}>Login dulu untuk mengajukan Akun Translation.</p>
            <Link href="/" className="rk-btn-primary mt-4 inline-block rounded-full px-5 py-2 text-sm font-bold">Ke Beranda</Link>
          </div>
        ) : mine ? (
          <div className="rk-card-soft rounded-3xl p-5">
            <div className="flex items-center gap-3">
              {mine.status === "approved" ? (
                <FiCheckCircle size={22} className="shrink-0 text-emerald-300" />
              ) : mine.status === "rejected" ? (
                <FiXCircle size={22} className="shrink-0 text-rose-300" />
              ) : (
                <FiClock size={22} className="shrink-0 text-amber-300" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-black">
                  {mine.status === "approved" ? "Akun Translation aktif — kamu Scanlator!" : mine.status === "rejected" ? "Pengajuan ditolak" : "Pengajuan menunggu review admin"}
                </p>
                <p className="truncate text-xs text-white/50">Tim {mine.team_name} · @{mine.handle} · {new Date(mine.created_at).toLocaleDateString("id-ID")}</p>
              </div>
            </div>
            {mine.review_note && (
              <p className="mt-3 rounded-xl bg-white/[.04] px-3 py-2 text-xs leading-relaxed text-white/65">Catatan admin: {mine.review_note}</p>
            )}
            {mine.status === "rejected" && (
              <p className="mt-3 text-xs leading-relaxed text-white/45">
                Kamu boleh mengajukan lagi dengan handle/tim yang sama setelah memperbaiki catatan di atas.
                Isi form di bawah untuk mengajukan ulang.
              </p>
            )}
            {mine.status !== "approved" && (
              <form onSubmit={submit} className="mt-5 space-y-3">
                <ApplyFields handle={handle} setHandle={setHandle} teamName={teamName} setTeamName={setTeamName} description={description} setDescription={setDescription} samples={samples} setSamples={setSamples} agree={agree} setAgree={setAgree} />
                {error && <p className="text-xs font-semibold text-rose-300">{error}</p>}
                <button type="submit" disabled={busy} className="rk-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold disabled:opacity-50">
                  <FiSend size={14} /> {busy ? "Mengirim…" : "Ajukan ulang"}
                </button>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="rk-card-soft space-y-4 rounded-3xl p-5">
            <ApplyFields handle={handle} setHandle={setHandle} teamName={teamName} setTeamName={setTeamName} description={description} setDescription={setDescription} samples={samples} setSamples={setSamples} agree={agree} setAgree={setAgree} />
            {error && <p className="text-xs font-semibold text-rose-300">{error}</p>}
            <button type="submit" disabled={busy} className="rk-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold disabled:opacity-50">
              <FiSend size={14} /> {busy ? "Mengirim…" : "Kirim Pengajuan"}
            </button>
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/40">
              <FiShield size={13} className="mt-0.5 shrink-0" />
              Pengajuanmu diperiksa manual oleh admin. Proses bisa beberapa hari di masa BETA. Kamu akan mendapat notifikasi saat diproses.
            </p>
          </form>
        )}

        <div className="rk-card-soft rounded-3xl p-5">
          <p className="text-[13px] font-bold text-white">Yang perlu kamu tahu (BETA)</p>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-white/55">
            <li>• Satu orang/tim = satu akun Translation. Akun ganda langsung ditolak.</li>
            <li>• Upload baru dibuka setelah Fase B — sekarang baru pengajuan & identitas.</li>
            <li>• Monetisasi sementara hanya link donate eksternal milikmu sendiri.</li>
            <li>• Aturan lengkap ada di PRD: <Link href="/prd/scanlator" className="font-semibold text-[var(--accent-2)] underline underline-offset-2">/prd/scanlator</Link></li>
          </ul>
        </div>
      </div>
    </main>
  );
}

function ApplyFields(props: {
  handle: string; setHandle: (v: string) => void;
  teamName: string; setTeamName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  samples: string; setSamples: (v: string) => void;
  agree: boolean; setAgree: (v: boolean) => void;
}) {
  const input = "rk-input w-full rounded-2xl px-4 py-3 text-sm";
  return (
    <>
      <div>
        <label className="mb-1.5 block text-xs font-bold text-white/70">Handle tim (unik, huruf kecil/angka/strip)</label>
        <input value={props.handle} onChange={(e) => props.setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="contoh: tim-baca-seru" maxLength={30} required className={input} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-bold text-white/70">Nama tim</label>
        <input value={props.teamName} onChange={(e) => props.setTeamName(e.target.value)} placeholder="contoh: Tim Baca Seru" maxLength={80} required className={input} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-bold text-white/70">Deskripsi singkat</label>
        <textarea value={props.description} onChange={(e) => props.setDescription(e.target.value)} rows={3} maxLength={1000} placeholder="Spesialisasi, pengalaman, genre favorit…" className={input} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-bold text-white/70">Contoh hasil TL (1–3, satu per baris — link atau deskripsi)</label>
        <textarea value={props.samples} onChange={(e) => props.setSamples(e.target.value)} rows={3} placeholder={"https://…\nChapter 12 — hasil TL tim kami"} className={input} />
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-white/60">
        <input type="checkbox" checked={props.agree} onChange={(e) => props.setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#8b5cf6]" />
        <span>
          Aku menyetujui <Link href="/prd/scanlator" className="font-semibold text-[var(--accent-2)] underline underline-offset-2">Syarat & Ketentuan Scanlator</Link> —
          termasuk hak cipta, kualitas upload, dan sanksi pencabutan akses.
        </span>
      </label>
    </>
  );
}
