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

const inputCls = "rk-input w-full rounded-2xl px-4 py-3 text-sm";

/**
 * Halaman Apply Request Akun Translation (Scanlator — BETA).
 * Desain mengikuti globals.css: rk-card / rk-card-soft / rk-chip.
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
      setHandle(""); setTeamName(""); setDescription(""); setSamples(""); setAgree(false);
      await loadMine();
    } catch {
      setError("Gagal mengajukan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="rk-page rk-app-surface px-4 pb-24 pt-20 text-white">
      <div className="mx-auto max-w-xl">
        <header className="rk-card rounded-3xl p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rk-chip rounded-full px-3 py-1 text-[11px] font-black">BETA</span>
            <span className="text-[11px] text-white/45">Fase A — identitas & pengajuan · upload menyusul</span>
          </div>
          <h1 className="mt-3 text-2xl font-black">Daftar Akun Translation</h1>
          <p className="mt-2 text-xs text-white/45">
            Baca dulu{" "}
            <Link href="/aturan/scanlator" className="font-semibold text-[var(--accent-2)] underline underline-offset-2">
              Syarat &amp; Ketentuan Scanlator
            </Link>{" "}
            sebelum mengajukan.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            Gerbang wajib sebelum bisa mengunggah hasil TL. Setiap pengajuan diperiksa admin manual —
            tidak semua user bisa langsung upload.
          </p>
        </header>

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
                <form onSubmit={submit} className="rk-card-soft space-y-4 rounded-3xl p-5 sm:p-6">
                  <p className="text-sm font-black text-white">
                    {mine ? "Ajukan ulang" : "Formulir pengajuan"}
                  </p>

                  <Field label="Handle tim" hint="Unik · huruf kecil, angka, strip · 3–30 karakter">
                    <input value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="contoh: tim-baca-seru" maxLength={30} required className={inputCls} />
                  </Field>

                  <Field label="Nama tim">
                    <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="contoh: Tim Baca Seru" maxLength={80} required className={inputCls} />
                  </Field>

                  <Field label="Deskripsi singkat">
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} placeholder="Spesialisasi, pengalaman, genre favorit…" className={inputCls} />
                  </Field>

                  <Field label="Contoh hasil TL" hint="1–3 contoh · satu per baris · link atau deskripsi">
                    <textarea value={samples} onChange={(e) => setSamples(e.target.value)} rows={3} placeholder={"https://…\nChapter 12 — hasil TL tim kami"} className={inputCls} />
                  </Field>

                  <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl bg-white/[.03] px-4 py-3 text-xs leading-relaxed text-white/60">
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#8b5cf6]" />
                    <span>
                      Aku menyetujui{" "}
                      <Link href="/aturan/scanlator" className="font-semibold text-[var(--accent-2)] underline underline-offset-2">
                        Syarat &amp; Ketentuan Scanlator
                      </Link>{" "}
                      — termasuk hak cipta, kualitas upload, dan sanksi pencabutan akses.
                    </span>
                  </label>

                  {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">{error}</p>}

                  <button type="submit" disabled={busy} className="rk-btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold disabled:opacity-50">
                    <FiSend size={14} /> {busy ? "Mengirim…" : mine ? "Kirim pengajuan ulang" : "Kirim pengajuan"}
                  </button>
                </form>
              )}

              <aside className="rk-card-soft rounded-3xl p-5 sm:p-6">
                <p className="flex items-center gap-2 text-sm font-black text-white"><FiShield size={15} className="text-[var(--accent-2)]" /> Yang perlu kamu tahu</p>
                <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-white/55">
                  <NoteItem>Satu orang atau satu tim = satu Akun Translation. Akun ganda langsung ditolak.</NoteItem>
                  <NoteItem>Upload dibuka setelah Fase B — sekarang baru pengajuan & identitas di masa BETA.</NoteItem>
                  <NoteItem>Monetisasi sementara hanya link donate eksternal milikmu sendiri.</NoteItem>
                  <NoteItem>
                    Aturan lengkap ada di{" "}
                    <Link href="/aturan/scanlator" className="font-semibold text-[var(--accent-2)] underline underline-offset-2">halaman S&amp;K resmi</Link>.
                  </NoteItem>
                </ul>
              </aside>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function StatusCard({ mine }: { mine: MyApplication }) {
  const approved = mine.status === "approved";
  const rejected = mine.status === "rejected";
  return (
    <div className="rk-card-soft flex items-start gap-3 rounded-3xl p-5">
      {approved ? (
        <FiCheckCircle size={22} className="mt-0.5 shrink-0 text-emerald-300" />
      ) : rejected ? (
        <FiXCircle size={22} className="mt-0.5 shrink-0 text-rose-300" />
      ) : (
        <FiClock size={22} className="mt-0.5 shrink-0 text-amber-300" />
      )}
      <div className="min-w-0">
        <p className="text-sm font-black text-white">
          {approved ? "Akun Translation aktif — kamu Scanlator" : rejected ? "Pengajuan ditolak" : "Pengajuan menunggu review admin"}
        </p>
        <p className="mt-0.5 text-xs text-white/45">
          {mine.team_name} · @{mine.handle} · {new Date(mine.created_at).toLocaleDateString("id-ID")}
        </p>
        {mine.review_note && (
          <p className="mt-2 rounded-xl bg-white/[.04] px-3 py-2 text-xs leading-relaxed text-white/65">Catatan admin: {mine.review_note}</p>
        )}
        {rejected && <p className="mt-2 text-xs leading-relaxed text-white/45">Perbaiki sesuai catatan, lalu ajukan ulang lewat formulir di bawah.</p>}
        {approved && (
          <Link href="/scanlator" className="rk-btn-primary mt-3 inline-block rounded-full px-4 py-2 text-xs font-bold">
            Buka Studio Scanlator
          </Link>
        )}
      </div>
    </div>
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

function NoteItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-2)]" />
      <span>{children}</span>
    </li>
  );
}
