"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowRight, FiCheck, FiCopy } from "react-icons/fi";
import { getSession } from "@/lib/auth/getSession";
import { clearLocalSessionCache } from "@/lib/auth/getSession";

/**
 * Halaman kode login.
 * - ?c=XXXXXX : tampilkan kode (dibuka di browser setelah OAuth).
 * - tanpa c  : formulir memasukkan kode (dipakai di dalam aplikasi/PWA).
 */
export default function HandoffClient({ code }: { code: string }) {
  const [value, setValue] = useState(code);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!code) return;
    void navigator.clipboard?.writeText(code).then(() => setCopied(true)).catch(() => undefined);
  }, [code]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!res.ok || !json?.success) { setError(json?.error || "Kode tidak valid."); return; }
      clearLocalSessionCache();
      await getSession();
      setDone(true);
      setTimeout(() => { window.location.replace("/"); }, 900);
    } catch {
      setError("Gagal memproses kode.");
    } finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-[var(--surface-0)] px-4 pb-20 pt-16 text-white">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-[19px] font-bold leading-tight">Masuk dengan kode</h1>

        {code ? (
          <>
            <p className="mt-1 text-[12px] leading-relaxed text-white/45">
              Login Google selesai. Buka <b className="text-white/70">aplikasi Ryukomik</b>, pilih
              &quot;Masuk dengan kode&quot;, lalu tempel kode ini. Kode berlaku 10 menit.
            </p>
            <div className="mt-4 rounded-xl border border-white/[.08] bg-white/[.03] px-5 py-6 text-center">
              <p className="text-[11px] uppercase tracking-widest text-white/35">Kode login</p>
              <p className="mt-2 font-mono text-[34px] font-bold tracking-[0.35em] text-white">{code}</p>
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(code).then(() => setCopied(true)).catch(() => undefined)}
                className="mt-3 inline-flex min-h-[34px] items-center gap-1.5 rounded-md border border-white/[.1] px-3 text-[11px] font-bold text-white/70"
              >
                {copied ? <FiCheck size={12} /> : <FiCopy size={12} />} {copied ? "Tersalin" : "Salin kode"}
              </button>
            </div>
            <Link href="/" className="mt-4 flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] text-[12px] font-bold">
              Sudah login di aplikasi <FiArrowRight size={13} />
            </Link>
          </>
        ) : (
          <>
            <p className="mt-1 text-[12px] leading-relaxed text-white/45">
              Tempel 6 digit kode dari halaman login browser.
            </p>
            <form onSubmit={submit} className="mt-4 space-y-3">
              <input
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className="w-full rounded-xl border border-white/[.08] bg-white/[.03] px-4 py-4 text-center font-mono text-2xl tracking-[0.3em] text-white outline-none focus:border-[var(--accent)]/60"
              />
              {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-200">{error}</p>}
              {done && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-200">Berhasil. Mengalihkan…</p>}
              <button type="submit" disabled={busy || value.length !== 6} className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] text-[12px] font-bold disabled:opacity-40">
                {busy ? "Memeriksa…" : "Masuk"}
              </button>
            </form>
            <p className="mt-3 text-[11px] leading-relaxed text-white/30">
              Belum punya kode? Buka ryukomik.my.id di browser, login dengan Google, lalu salin kodenya.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
