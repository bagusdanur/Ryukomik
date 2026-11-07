"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FiAlertTriangle, FiArrowLeft, FiCheck } from "react-icons/fi";
import {
  ADULT_CONSENT_REQUEST,
  grantAdultConsent,
  hasAdultConsent,
  isAdultSource,
} from "@/utils/adultConsent";

type RequestDetail = { onApproved?: () => void };

export default function AdultConsentProvider() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [callback, setCallback] = useState<(() => void) | null>(null);
  const source = pathname.split("/")[2] || "";
  const routeNeedsConsent =
    (pathname.startsWith("/komik/") || pathname.startsWith("/chapter/")) && isAdultSource(source);

  useEffect(() => {
    const request = (event: Event) => {
      const detail = (event as CustomEvent<RequestDetail>).detail;
      if (hasAdultConsent()) { detail?.onApproved?.(); return; }
      setCallback(() => detail?.onApproved || null);
      setOpen(true);
    };
    window.addEventListener(ADULT_CONSENT_REQUEST, request);
    return () => window.removeEventListener(ADULT_CONSENT_REQUEST, request);
  }, []);

  useEffect(() => {
    const currentPath = window.location.pathname;
    const currentSource = currentPath.split("/")[2] || "";
    const directAdultRoute =
      (currentPath.startsWith("/komik/") || currentPath.startsWith("/chapter/")) &&
      isAdultSource(currentSource);
    if ((routeNeedsConsent || directAdultRoute) && !hasAdultConsent()) {
      const timer = window.setTimeout(() => setOpen(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, [pathname, routeNeedsConsent]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  if (!open) return null;

  const approve = () => {
    grantAdultConsent();
    setOpen(false);
    const next = callback;
    setCallback(null);
    next?.();
  };

  const leave = () => {
    setOpen(false);
    setCallback(null);
    if (routeNeedsConsent) {
      if (window.history.length > 1) router.back();
      else router.push("/");
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-black/85 p-4" role="dialog" aria-modal="true" aria-labelledby="adult-warning-title">
      <section className="my-auto w-[min(100%,24rem)] shrink-0 rounded-xl border border-white/[.1] bg-[var(--surface-1)] p-5 text-white">
        <span className="grid h-11 w-11 place-items-center rounded-lg border border-rose-300/25 bg-rose-400/[.08] text-rose-300">
          <FiAlertTriangle size={21} />
        </span>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[.16em] text-rose-300/75">Peringatan 18+</p>
        <h2 id="adult-warning-title" className="mt-1 text-lg font-black">Konten khusus dewasa</h2>
        <p className="mt-2 text-sm leading-6 text-white/55">
          Halaman ini ditujukan untuk pengguna berusia 18 tahun ke atas dan mungkin memuat materi sensitif.
        </p>
        <p className="mt-2 text-[11px] leading-5 text-white/35">Persetujuan disimpan selama 30 hari di perangkat ini.</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={leave} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/[.1] px-3 text-sm font-bold text-white/65 hover:bg-white/[.05]">
            <FiArrowLeft /> Kembali
          </button>
          <button type="button" onClick={approve} autoFocus className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 text-sm font-black text-white">
            <FiCheck /> Saya 18+
          </button>
        </div>
      </section>
    </div>
  );
}
