"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import BanNoticeCard, { type BanInfo } from "@/components/ban/BanNoticeCard";

const STORAGE_KEY = "rk-ban-notice";

type StoredBan = BanInfo & { at: number };

/**
 * Pemberitahuan saat login gagal karena akun diblokir.
 *
 * Sumbernya dua:
 *  1. Query `?login=banned` setelah callback OAuth ditolak Supabase.
 *  2. localStorage `rk-ban-notice` yang ditulis callback, supaya peringatan
 *     tetap muncul walau query string hilang saat redirect.
 * Detail (berakhir/alasan) ikut disimpan kalau tersedia dari /api/ban/lookup.
 */
export default function BanLoginNotice() {
  const [info, setInfo] = useState<BanInfo | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flagged = params.get("login") === "banned" || params.get("banned") === "1";

    let stored: StoredBan | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw) as StoredBan;
    } catch {
      stored = null;
    }

    if (flagged || stored) {
      setInfo({
        bannedUntil: stored?.bannedUntil ?? null,
        permanent: stored?.permanent,
        reason: stored?.reason ?? null,
        contactUrl: stored?.contactUrl,
      });
    }
    if (flagged) {
      // Bersihkan query supaya tidak muncul lagi saat refresh.
      const url = new URL(window.location.href);
      url.searchParams.delete("login");
      url.searchParams.delete("banned");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  function close() {
    setInfo(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage bisa diblokir browser */
    }
  }

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
        description="Login tidak bisa dilanjutkan karena akun ini masih diblokir admin."
        onClose={close}
      />
    </div>,
    document.body,
  );
}
