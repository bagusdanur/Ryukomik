"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import BanNoticeCard, { type BanInfo } from "@/components/ban/BanNoticeCard";

const STORAGE_KEY = "rk-ban-notice";
const LAST_USER_KEY = "rk-last-user";

type StoredBan = BanInfo & { at: number };

/**
 * Pemberitahuan saat login gagal karena akun diblokir.
 *
 * Detail (sisa waktu, tanggal berakhir, alasan) diambil dari
 * POST /api/ban/lookup memakai user id terakhir yang berhasil login di
 * perangkat ini — Supabase mencabut sesi saat ban, jadi tidak ada token.
 * Kalau lookup gagal, pakai penanda `rk-ban-notice` yang ditulis BanGate.
 */
export default function BanLoginNotice() {
  const [info, setInfo] = useState<BanInfo | null>(null);
  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flagged = params.get("login") === "banned" || params.get("banned") === "1";

    let stored: StoredBan | null = null;
    let lastUserId = "";
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw) as StoredBan;
      const lastUser = localStorage.getItem(LAST_USER_KEY);
      if (lastUser) lastUserId = (JSON.parse(lastUser) as { id?: string })?.id || "";
    } catch {
      stored = null;
    }

    if (!flagged && !stored) return;

    // Tampilkan dulu apa yang tersimpan supaya responsnya instan.
    if (stored) {
      setInfo({
        bannedUntil: stored.bannedUntil ?? null,
        permanent: stored.permanent,
        reason: stored.reason ?? null,
        contactUrl: stored.contactUrl,
      });
    } else {
      setInfo({});
    }

    // Lalu segarkan dari server (sisa waktu paling akurat).
    if (lastUserId) {
      fetch("/api/ban/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: lastUserId }),
        cache: "no-store",
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: (BanInfo & { banned?: boolean }) | null) => {
          if (!data?.banned) return;
          setInfo({
            bannedUntil: data.bannedUntil ?? null,
            permanent: data.permanent,
            reason: data.reason ?? null,
            contactUrl: data.contactUrl,
          });
        })
        .catch(() => undefined);
    }

    if (flagged) {
      const url = new URL(window.location.href);
      url.searchParams.delete("login");
      url.searchParams.delete("banned");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  async function lookupByEmail(email: string) {
    setChecking(true);
    setLookupError(null);
    try {
      const res = await fetch("/api/ban/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as (BanInfo & { banned?: boolean }) | null;
      if (!data?.banned) {
        setLookupError("Email ini tidak sedang diblokir.");
        return;
      }
      setInfo({
        bannedUntil: data.bannedUntil ?? null,
        permanent: data.permanent,
        reason: data.reason ?? null,
        contactUrl: data.contactUrl,
      });
      try {
        localStorage.setItem(
          "rk-ban-notice",
          JSON.stringify({
            bannedUntil: data.bannedUntil ?? null,
            permanent: data.permanent ?? false,
            reason: data.reason ?? null,
            contactUrl: data.contactUrl,
            at: Date.now(),
          }),
        );
      } catch {
        /* storage bisa diblokir browser */
      }
    } catch {
      setLookupError("Gagal memeriksa. Coba lagi sebentar.");
    } finally {
      setChecking(false);
    }
  }

  function close() {
    setInfo(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage bisa diblokir browser */
    }
  }

  const hasDetails = Boolean(info?.bannedUntil || info?.permanent || info?.reason);
  if (!mounted || !info) return null;

  return createPortal(
    <div style={{ zIndex: 2147482900 }} className="fixed inset-0 flex items-center justify-center px-5 py-8">
      <div
        className="absolute inset-0"
        style={{ background: "color-mix(in srgb, var(--background) 92%, transparent)", backdropFilter: "blur(8px)" }}
      />
      <BanNoticeCard
        info={info}
        title="Akun Masih Diblokir"
        description={
          hasDetails
            ? "Login tidak bisa dilanjutkan karena akun ini masih diblokir admin."
            : "Masukkan email akunmu untuk melihat sampai kapan blokirnya berlaku."
        }
        askEmail={!hasDetails}
        checking={checking}
        lookupError={lookupError}
        onEmailSubmit={lookupByEmail}
        onClose={close}
      />
    </div>,
    document.body,
  );
}
