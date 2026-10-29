"use client";

/**
 * Kartu pemberitahuan blokir — dipakai dua tempat:
 *  - BanGate (akun sedang login tapi diblokir → akses penuh ditutup)
 *  - BanLoginNotice (gagal login karena akun diblokir)
 *
 * Warna memakai token globals.css: --background, --surface-1, --surface-2,
 * --line-soft, --accent-2. Jangan hardcode warna baru di sini.
 */

import { useEffect, useState } from "react";

export type BanInfo = {
  permanent?: boolean;
  bannedUntil?: string | null;
  reason?: string | null;
  contactUrl?: string;
};

const DEFAULT_CONTACT = "https://chat.whatsapp.com/JJjlXcgdm90H5qNaJiXPDV";

/** "1 hari 3 jam", "2 jam 15 menit", "kurang dari 1 menit". */
function formatRemaining(bannedUntil: string | null | undefined, now: number) {
  if (!bannedUntil) return null;
  const end = Date.parse(bannedUntil);
  if (!Number.isFinite(end)) return null;
  const diff = end - now;
  if (diff <= 0) return "sudah berakhir";
  const minutes = Math.floor(diff / 60_000);
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days} hari ${hours} jam`;
  if (hours > 0) return `${hours} jam ${mins} menit`;
  return `${Math.max(1, mins)} menit`;
}

function formatUntil(info: BanInfo) {
  if (info.permanent || !info.bannedUntil) return "permanen";
  const date = new Date(info.bannedUntil);
  if (Number.isNaN(date.getTime())) return "permanen";
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

export default function BanNoticeCard({
  info,
  title = "Akun Kamu Diblokir",
  description = "Situs dan akun tidak bisa dipakai sampai blokir dicabut admin.",
  busy = false,
  onLogout,
  onClose,
}: {
  info: BanInfo;
  title?: string;
  description?: string;
  busy?: boolean;
  onLogout?: () => void;
  onClose?: () => void;
}) {
  const contact = info.contactUrl || DEFAULT_CONTACT;
  const showDetails = Boolean(info.bannedUntil || info.permanent || info.reason);

  // Hitung sisa waktu berkala supaya angka tidak basi saat modal dibiarkan terbuka.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const remaining = formatRemaining(info.bannedUntil, now);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="relative w-full max-w-md rounded-[18px] p-6 text-center"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--line-soft)",
        color: "var(--foreground)",
        boxShadow: "0 24px 70px rgba(0,0,0,.55)",
      }}
    >
      <div
        className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full text-2xl"
        style={{ background: "color-mix(in srgb, #fb7185 16%, transparent)", color: "#fb7185" }}
      >
        🚫
      </div>

      <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--accent-2)" }}>
        Akses ditutup
      </p>
      <h1 className="mt-1 text-lg font-black">{title}</h1>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-white/55">{description}</p>

      {showDetails && (
        <div
          className="mt-4 space-y-2 rounded-xl p-3 text-left text-[11px]"
          style={{ background: "var(--surface-2)", border: "1px solid var(--line-soft)" }}
        >
          {info.bannedUntil ? (
            <p className="text-white/60">
              <span className="font-bold text-white/40">Sisa waktu:</span>{" "}
              <span style={{ color: "var(--accent-2)" }} className="font-bold">
                {remaining}
              </span>
            </p>
          ) : null}
          {info.bannedUntil || info.permanent ? (
            <p className="text-white/60">
              <span className="font-bold text-white/40">Berakhir:</span> {formatUntil(info)}
            </p>
          ) : null}
          <p className="text-white/60">
            <span className="font-bold text-white/40">Alasan:</span>{" "}
            {info.reason?.trim() ? info.reason : "tidak disebutkan"}
          </p>
        </div>
      )}

      <a
        href={contact}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-[#04121a] transition hover:brightness-110"
        style={{ background: "var(--accent-2)" }}
      >
        💬 Tanya di Grup WhatsApp
      </a>

      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          disabled={busy}
          className="mt-2 w-full rounded-xl px-4 py-2.5 text-xs font-bold transition hover:bg-white/[0.06] disabled:opacity-50"
          style={{ border: "1px solid var(--line-soft)", color: "color-mix(in srgb, var(--foreground) 70%, transparent)" }}
        >
          {busy ? "Keluar..." : "Logout"}
        </button>
      )}

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-xl px-4 py-2.5 text-xs font-bold transition hover:bg-white/[0.06]"
          style={{ border: "1px solid var(--line-soft)", color: "color-mix(in srgb, var(--foreground) 70%, transparent)" }}
        >
          Tutup
        </button>
      )}

      <p className="mt-3 text-[10px] text-white/30">
        Kamu tetap bisa membaca sebagai tamu, tapi tidak bisa memakai akun yang diblokir.
      </p>
    </div>
  );
}
