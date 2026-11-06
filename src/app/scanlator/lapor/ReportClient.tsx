"use client";

import { useState } from "react";
import Link from "next/link";
import { FiAlertTriangle, FiArrowLeft, FiSend } from "react-icons/fi";
import { getSession } from "@/lib/auth/getSession";

/** Form laporan/takedown & banding. */
export default function ReportClient({ slug, handle, kind: initialKind }: { slug: string; handle: string; kind: string }) {
  const [kind, setKind] = useState(initialKind === "appeal" ? "appeal" : "copyright");
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const { data } = await getSession();
      const token = data.session?.access_token;
      if (!token) { setError("Login dulu untuk mengirim laporan."); return; }
      const res = await fetch("/api/scanlator/report", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ kind, target_slug: slug, target_handle: handle, reason, detail }),
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Gagal mengirim laporan."); return; }
      setDone(true);
    } finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-[var(--surface-0)] px-4 pb-20 pt-16 text-white">
      <div className="mx-auto w-full max-w-xl">
        <Link href={handle ? `/scanlator/${handle}` : "/"} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/40 hover:text-white/70">
          <FiArrowLeft size={12} /> Kembali
        </Link>

        <h1 className="mt-3 text-[19px] font-bold leading-tight">{kind === "appeal" ? "Ajukan Banding" : "Laporkan"}</h1>
        <p className="mt-1 text-[12px] leading-relaxed text-white/45">
          {kind === "appeal"
            ? "Jelaskan alasan banding. Admin akan meninjau dan menghubungi lewat kontak yang terdaftar."
            : "Laporan hak cipta atau pelanggaran diproses maksimal 1×24 jam. Sertakan bukti bila ada."}
        </p>

        {done ? (
          <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/[.06] p-4 text-[12px] text-emerald-100/85">
            Laporan terkirim. Admin akan meninjaunya.
            <div className="mt-3">
              <Link href="/" className="text-[var(--accent-2)] font-bold">Kembali ke beranda</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div className="rounded-xl border border-white/[.07] bg-white/[.02] p-4">
              <div className="flex gap-1 rounded-lg border border-white/[.07] p-1">
                {[
                  { id: "copyright", label: "Hak cipta" },
                  { id: "appeal", label: "Banding" },
                  { id: "other", label: "Lainnya" },
                ].map((k) => (
                  <button key={k.id} type="button" onClick={() => setKind(k.id)}
                    className={`min-h-[34px] flex-1 rounded-md text-[11px] font-bold transition-colors ${kind === k.id ? "bg-white/[.08] text-white" : "text-white/40"}`}>
                    {k.label}
                  </button>
                ))}
              </div>

              {(slug || handle) && (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-white/40">
                  <FiAlertTriangle size={11} className="text-amber-300/70" />
                  {slug ? `Project: ${slug}` : ""}{slug && handle ? " · " : ""}{handle ? `User: @${handle}` : ""}
                </p>
              )}

              <div className="mt-3">
                <label className="mb-1.5 block text-[11px] font-semibold text-white/60">Alasan singkat *</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={200}
                  placeholder={kind === "appeal" ? "Contoh: suspend keliru" : "Contoh: karya ini milik saya"}
                  className="w-full rounded-lg border border-white/[.08] bg-white/[.03] px-3 py-2.5 text-[13px] outline-none placeholder:text-white/25 focus:border-[var(--accent)]/60" />
              </div>

              <div className="mt-3">
                <label className="mb-1.5 block text-[11px] font-semibold text-white/60">Detail / bukti</label>
                <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={5} maxLength={2000}
                  placeholder="Link bukti, kronologi, dsb."
                  className="w-full rounded-lg border border-white/[.08] bg-white/[.03] px-3 py-2.5 text-[13px] outline-none placeholder:text-white/25 focus:border-[var(--accent)]/60" />
              </div>
            </div>

            {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-200">{error}</p>}

            <button type="submit" disabled={busy} className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] text-[12px] font-bold disabled:opacity-50">
              <FiSend size={13} /> {busy ? "Mengirim…" : "Kirim laporan"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
