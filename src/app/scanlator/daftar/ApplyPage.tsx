"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowRight, FiCheck, FiClock, FiInfo, FiSend, FiX } from "react-icons/fi";
import { getSession } from "@/lib/auth/getSession";
import { Button, Field, Panel, PanelHead, Row, inputClass } from "@/components/scanlator/ui";

type MyApplication = {
  id: string; handle: string; team_name: string; status: string; review_note: string | null; created_at: string;
};

export default function ScanlatorApplyPage() {
  const [handle, setHandle] = useState("");
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [samples, setSamples] = useState("");
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
      if (res.ok) setMine(((await res.json()) as { application?: MyApplication | null }).application || null);
    } catch {
      setMine(null);
    } finally { setLoading(false); }
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
          contact_discord: dc,
          agree_terms: agree,
        }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Gagal mengajukan."); return; }
      setHandle(""); setTeamName(""); setDescription(""); setSamples(""); setDc(""); setAgree(false);
      await loadMine();
    } catch { setError("Gagal mengajukan."); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-[var(--surface-0)] px-4 pb-20 pt-16 text-white">
      <div className="mx-auto w-full max-w-xl">
        <div className="pb-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/30">Akun Translation · Beta</p>
          <h1 className="mt-1 text-[19px] font-bold leading-tight">Jadi Scanlator</h1>
          <p className="mt-1 text-[12px] leading-relaxed text-white/45">
            Unggah hasil TL, dapat atribusi nama user, pasang tautan donate sendiri. Pengajuan diperiksa admin.
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-white/[.07] bg-white/[.02] p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--accent-2)]">Yang kamu dapat</p>
          <ul className="mt-2 space-y-1.5">
            {[
              "Badge SCANLATOR di profil, komentar, leaderboard, dan postingan",
              "Premium gratis selama status user aktif — tanpa bayar",
              "Studio upload: chapter, edit halaman, pratinjau, dan statistik tayangan",
              "Atribusi nama user + tautan profil di setiap seri yang kamu unggah",
              "Tautan donate (DANA/GoPay, Trakteer, Tako) tampil di halaman seri",
            ].map((b) => (
              <li key={b} className="flex gap-2 text-[11.5px] leading-relaxed text-white/60">
                <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {loading ? (
          <p className="py-16 text-center text-[13px] text-white/35">Memuat…</p>
        ) : needLogin ? (
          <Panel className="p-6 text-center">
            <p className="text-[13px] text-white/55">Masuk dulu untuk mengajukan.</p>
            <Link href="/" className="mt-4 inline-flex min-h-[40px] items-center rounded-lg bg-[var(--accent)] px-4 text-[12px] font-bold">Ke beranda</Link>
          </Panel>
        ) : (
          <div className="space-y-3">
            {mine && <StatusPanel mine={mine} />}

            {(!mine || mine.status === "rejected") && (
              <form onSubmit={submit} className="space-y-3">
                <Panel>
                  <PanelHead title={mine ? "Ajukan ulang" : "Formulir pengajuan"} desc="Semua field bertanda * wajib diisi." />
                  <div className="space-y-3 p-4">
                    <Field label="Nama tim *" hint="tampil di halaman publik & kartu project">
                      <input value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={80} required placeholder="Scan Baca Seru" className={inputClass} />
                    </Field>
                    <Field label="Alamat halaman tim (handle) *" hint="huruf kecil, angka, strip">
                      <input value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} maxLength={30} required placeholder="contoh: scan-baca-seru" className={inputClass} />
                      <p className="mt-1.5 break-all rounded-md border border-white/[.06] bg-white/[.02] px-2.5 py-1.5 text-[10.5px] text-white/50">
                        Halaman tim kamu nanti:{" "}
                        <span className="font-semibold text-white/75">ryukomik.com/scanlator/{handle || "nama-tim"}</span>
                      </p>
                      <p className="mt-1 text-[10.5px] leading-relaxed text-white/35">
                        Ini <span className="font-semibold text-white/55">bukan</span> username medsos, Discord, atau Telegram — ini alamat
                        halaman tim di Ryukomik. Pilih yang gampang diingat; setelah dibuat hanya admin yang bisa mengubahnya.
                      </p>
                    </Field>
                    <Field label="Deskripsi"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} placeholder="Pengalaman, genre, dsb." className={inputClass} /></Field>
                    <Field label="Contoh hasil TL *" hint="satu per baris, maks 3">
                      <textarea value={samples} onChange={(e) => setSamples(e.target.value)} rows={3} placeholder={"https://…\nChapter 12 — contoh TL"} className={inputClass} />
                    </Field>
                  </div>
                </Panel>

                <Panel>
                  <PanelHead title="Kontak" desc="Discord wajib — admin menghubungi lewat Discord. Tidak tampil publik." />
                  <div className="space-y-3 p-4">
                    <Field label="Username Discord *" hint="tanpa @">
                      <input value={dc} onChange={(e) => setDc(e.target.value)} required placeholder="username" className={inputClass} />
                    </Field>
                  </div>
                </Panel>

                <label className="flex items-start gap-2.5 rounded-lg border border-white/[.06] px-3 py-2.5 text-[11px] leading-relaxed text-white/50">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#8b5cf6]" />
                  <span>
                    Saya setuju{" "}
                    <Link href="/aturan/scanlator" className="font-semibold text-[var(--accent-2)]">Syarat &amp; Ketentuan Scanlator</Link>{" "}
                    termasuk aturan hak cipta dan sanksi.
                  </span>
                </label>

                {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-200">{error}</p>}

                <Button type="submit" disabled={busy} className="w-full">
                  <FiSend size={13} /> {busy ? "Mengirim…" : mine ? "Kirim ulang" : "Kirim pengajuan"}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function StatusPanel({ mine }: { mine: MyApplication }) {
  const approved = mine.status === "approved";
  const rejected = mine.status === "rejected";
  return (
    <Panel>
      <div className="flex items-start gap-2.5 p-4">
        <span className={`mt-0.5 shrink-0 ${approved ? "text-emerald-400" : rejected ? "text-rose-400" : "text-amber-400"}`}>
          {approved ? <FiCheck size={16} /> : rejected ? <FiX size={16} /> : <FiClock size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold">{approved ? "Akun Translation aktif" : rejected ? "Pengajuan ditolak" : "Menunggu review"}</p>
          <p className="mt-0.5 text-[11px] text-white/35">
            {mine.team_name} · @{mine.handle} · {new Date(mine.created_at).toLocaleDateString("id-ID")}
          </p>
          {mine.review_note && (
            <p className="mt-2 flex items-start gap-1.5 rounded-md bg-white/[.04] px-2.5 py-2 text-[11px] leading-relaxed text-white/55">
              <FiInfo size={11} className="mt-0.5 shrink-0 text-white/30" /> {mine.review_note}
            </p>
          )}
        </div>
      </div>
      {approved && (
        <Row className="px-4">
          <Link href="/scanlator" className="flex min-h-[40px] items-center justify-between text-[12px] font-bold text-white">
            Buka studio <FiArrowRight size={13} className="text-white/40" />
          </Link>
        </Row>
      )}
    </Panel>
  );
}
