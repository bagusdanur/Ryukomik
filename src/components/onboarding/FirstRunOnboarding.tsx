"use client";

import { Component, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  FiBell,
  FiBookOpen,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiLock,
  FiShield,
  FiX,
} from "react-icons/fi";
import { AuthContext } from "@/components/auth/AuthProvider";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { setAdultHidden } from "@/utils/adultFilter";
import { grantAdultConsent, revokeAdultConsent } from "@/utils/adultConsent";
import { isPushSupported, subscribePush } from "@/utils/pushSubscription";

/**
 * Layar awal sekali jalan (gaya aplikasi baru di-install).
 *
 * ATURAN KERAS:
 * - Hanya dipasang di beranda, BUKAN di root layout.
 * - Fail-open: kalau storage/JS gagal, overlay TIDAK dirender.
 * - Penanda ditulis begitu overlay tampil, jadi tidak pernah muncul 2x.
 * - Selalu ada tombol tutup (X) + "Lewati" di semua slide.
 * - Auto-tutup 30 detik tanpa interaksi.
 */

const STORAGE_KEY = "rk-onboard-v1";
const PENDING_NOTIF_KEY = "rk-onboarding-notif";
const Z_INDEX = 2147482500;
const AUTO_CLOSE_MS = 30_000;

type Slide = {
  step: string;
  icon: typeof FiBookOpen;
  tone: "violet" | "cyan" | "rose";
  title: string;
  body: ReactNode;
};

const SLIDES: Slide[] = [
  {
    step: "Langkah 1 dari 4",
    icon: FiBookOpen,
    tone: "violet",
    title: "Selamat datang di Ryukomik",
    body: (
      <>
        Baca manga, manhwa &amp; manhua sub Indo, plus nonton anime &amp; donghua — semua di satu
        tempat.
      </>
    ),
  },
  {
    step: "Langkah 2 dari 4",
    icon: FiBell,
    tone: "cyan",
    title: "Aktifkan Notifikasi",
    body: <>Dapat info chapter baru dari seri yang kamu ikuti.</>,
  },
  {
    step: "Langkah 3 dari 4",
    icon: FiShield,
    tone: "rose",
    title: "Konten 18+",
    body: <>Pilih mau menyembunyikan atau mengizinkan sumber komik 18+.</>,
  },
  {
    step: "Langkah 4 dari 4",
    icon: FiLock,
    tone: "violet",
    title: "Masuk untuk Simpan",
    body: <>Login sekali supaya bookmark, riwayat, dan pengaturan tersimpan di akunmu.</>,
  },
];

const TONE: Record<Slide["tone"], string> = {
  violet: "rgba(139,92,246,.20)",
  cyan: "rgba(34,211,238,.16)",
  rose: "rgba(244,63,94,.16)",
};

class SafeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function OnboardingInner() {
  const { user: localUser } = useContext(AuthContext);
  const { user: supaUser } = useSupabaseUser();
  const user = localUser || supaUser;

  const [status, setStatus] = useState<"idle" | "visible" | "done">("idle");
  const [slide, setSlide] = useState(0);
  const [notif, setNotif] = useState(false);
  const [adultAllowed, setAdultAllowed] = useState(false);
  const [note, setNote] = useState("");
  const drag = useRef({ start: 0, delta: 0, active: false });
  const idleTimer = useRef<number | null>(null);

  // Tampil sekali. Penanda ditulis SEBELUM overlay dirender.
  useEffect(() => {
    try {
      // Bersihkan penanda versi lama (onboarding yang memblokir baca).
      try {
        localStorage.removeItem("rk-onboarding-v1");
      } catch {
        /* abaikan */
      }
      // Mode pratinjau: /?onboarding=1 memaksa slide tampil walau penanda sudah ada.
      let forced = false;
      try {
        const flag = new URLSearchParams(window.location.search).get("onboarding");
        forced = flag === "1" || flag === "force" || flag === "preview";
      } catch {
        forced = false;
      }

      if (!forced && localStorage.getItem(STORAGE_KEY) === "1") {
        setStatus("done");
        return;
      }
      localStorage.setItem(STORAGE_KEY, "1");
      setStatus("visible");
      if (typeof window !== "undefined" && "Notification" in window) {
        setNotif(Notification.permission === "granted");
      }
      try {
        setAdultAllowed(localStorage.getItem("rk-hide-adult") === "0");
      } catch {
        /* abaikan */
      }
    } catch {
      // Storage diblokir → jangan pernah memblokir pengguna.
      setStatus("done");
    }
  }, []);

  const close = useCallback(() => {
    setStatus("done");
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
  }, []);

  // Auto-tutup kalau dibiarkan.
  useEffect(() => {
    if (status !== "visible") return;
    idleTimer.current = window.setTimeout(close, AUTO_CLOSE_MS);
    return () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [status, close]);

  const resetIdle = useCallback(() => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(close, AUTO_CLOSE_MS);
  }, [close]);

  const go = useCallback((next: number) => {
    resetIdle();
    setSlide(Math.max(0, Math.min(SLIDES.length - 1, next)));
  }, [resetIdle]);

  const applyAdult = useCallback((allow: boolean) => {
    resetIdle();
    setAdultAllowed(allow);
    try {
      setAdultHidden(!allow);
      if (allow) grantAdultConsent();
      else revokeAdultConsent();
    } catch {
      /* abaikan */
    }
  }, [resetIdle]);

  const askNotif = useCallback(async () => {
    resetIdle();
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNote("Perangkat ini tidak mendukung notifikasi.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === "granted";
      setNotif(granted);
      if (granted) {
        if (user?.id && isPushSupported()) await subscribePush(user.id);
        else localStorage.setItem(PENDING_NOTIF_KEY, "1");
      }
      setNote(
        granted
          ? "Notifikasi aktif."
          : permission === "denied"
            ? "Diblokir browser — aktifkan lewat pengaturan."
            : "Belum diizinkan.",
      );
    } catch {
      setNote("Izin notifikasi tidak tersedia.");
    }
  }, [resetIdle, user?.id]);

  const login = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* abaikan */
    }
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/api/auth/google/start?next=${next}`;
  }, []);

  const onStart = (x: number) => {
    if (status !== "visible") return;
    drag.current = { start: x, delta: 0, active: true };
  };
  const onMove = (x: number) => {
    if (!drag.current.active) return;
    drag.current.delta = x - drag.current.start;
  };
  const onEnd = () => {
    if (!drag.current.active) return;
    const { delta } = drag.current;
    drag.current.active = false;
    drag.current.delta = 0;
    if (delta < -50) go(slide + 1);
    else if (delta > 50) go(slide - 1);
  };

  if (status !== "visible") return null;

  const current = SLIDES[slide];
  const Icon = current.icon;
  const isLast = slide === SLIDES.length - 1;

  return createPortal(
    <div
      style={{ zIndex: Z_INDEX }}
      className="fixed inset-0 flex items-end sm:items-center justify-center px-3 pb-3 sm:pb-6"
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(5,6,12,.72)", backdropFilter: "blur(6px)" }}
        onClick={close}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[392px] rounded-[24px] overflow-hidden flex flex-col"
        style={{
          background: "var(--surface-0)",
          border: "1px solid var(--line-soft)",
          boxShadow: "0 28px 70px rgba(0,0,0,.6)",
          maxHeight: "92vh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-black text-white"
              style={{ background: "var(--accent)" }}
            >
              R
            </span>
            <span className="text-[14px] font-black text-white">
              Ryukomik<span style={{ color: "var(--accent-2)" }}>.</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => (isLast ? close() : go(SLIDES.length - 1))}
              className="text-[12px] font-bold px-2 py-1 rounded-lg"
              style={{ color: "var(--muted)" }}
            >
              Lewati
            </button>
            <button
              type="button"
              onClick={close}
              aria-label="Tutup"
              className="h-8 w-8 grid place-items-center rounded-full"
              style={{ background: "rgba(255,255,255,.06)", color: "var(--muted)" }}
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        <div className="h-[2px] mx-5 mt-3 rounded-full" style={{ background: "rgba(255,255,255,.07)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${((slide + 1) / SLIDES.length) * 100}%`,
              background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
            }}
          />
        </div>

        {/* Isi */}
        <div
          className="overflow-y-auto"
          style={{ touchAction: "pan-y" }}
          onTouchStart={(e) => onStart(e.touches[0].clientX)}
          onTouchMove={(e) => onMove(e.touches[0].clientX)}
          onTouchEnd={onEnd}
          onMouseDown={(e) => onStart(e.clientX)}
          onMouseMove={(e) => onMove(e.clientX)}
          onMouseUp={onEnd}
          onMouseLeave={onEnd}
        >
          <div
            className="flex"
            style={{
              transform: `translateX(calc(-${slide * 100}% + ${drag.current.delta}px))`,
              transitionProperty: drag.current.active ? "none" : "transform",
              transitionDuration: "260ms",
            }}
          >
            {SLIDES.map((item, index) => {
              const ItemIcon = item.icon;
              return (
                <section
                  key={item.step}
                  className="min-w-full flex flex-col items-center text-center gap-2.5 px-6 pt-5 pb-2"
                >
                  <div
                    className="w-[104px] h-[104px] rounded-[26px] grid place-items-center"
                    style={{
                      background: TONE[item.tone],
                      border: "1px solid var(--line-soft)",
                      color:
                        item.tone === "cyan"
                          ? "var(--accent-2)"
                          : item.tone === "rose"
                            ? "var(--accent-3)"
                            : "var(--accent)",
                    }}
                  >
                    <ItemIcon size={44} strokeWidth={1.6} />
                  </div>

                  <div
                    className="text-[9.5px] font-extrabold uppercase mt-1"
                    style={{ color: "var(--accent-2)", letterSpacing: ".14em" }}
                  >
                    {item.step}
                  </div>

                  <h2 className="text-[21px] leading-[1.2] font-black text-white m-0">{item.title}</h2>

                  <p className="text-[13px] leading-[1.55] m-0 max-w-[290px]" style={{ color: "var(--muted)" }}>
                    {item.body}
                  </p>

                  {index === 1 && (
                    <div className="w-full max-w-[300px] flex flex-col gap-2 mt-1">
                      <label
                        className="w-full flex items-center justify-between gap-3 rounded-[13px] px-3.5 py-2.5 cursor-pointer"
                        style={{ background: "var(--surface-1)", border: "1px solid var(--line-soft)" }}
                      >
                        <span className="flex items-center gap-2.5 text-left">
                          <FiBell size={17} style={{ color: "var(--accent-2)" }} />
                          <span>
                            <b className="block text-[12.5px] font-extrabold text-white">Notifikasi</b>
                            <small className="text-[10.5px]" style={{ color: "var(--muted)" }}>
                              Chapter baru &amp; pengumuman
                            </small>
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          className="rk-switch"
                          checked={notif}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setNotif(next);
                            if (next) void askNotif();
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={askNotif}
                        className="rk-btn-ghost w-full h-10 rounded-[13px] font-extrabold text-[12.5px]"
                      >
                        Izinkan Notifikasi
                      </button>
                      {note && (
                        <p className="text-[11px] m-0 text-left" style={{ color: "var(--muted)" }}>
                          {note}
                        </p>
                      )}
                    </div>
                  )}

                  {index === 2 && (
                    <div className="w-full max-w-[300px] flex flex-col gap-2 mt-1">
                      <div className="flex gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => applyAdult(false)}
                          className="flex-1 h-10 rounded-[13px] font-extrabold text-[12.5px]"
                          style={
                            !adultAllowed
                              ? { background: "var(--accent)", color: "#fff" }
                              : { background: "var(--surface-1)", color: "var(--muted)", border: "1px solid var(--line-soft)" }
                          }
                        >
                          Sembunyikan 18+
                        </button>
                        <button
                          type="button"
                          onClick={() => applyAdult(true)}
                          className="flex-1 h-10 rounded-[13px] font-extrabold text-[12.5px]"
                          style={
                            adultAllowed
                              ? { background: "var(--accent)", color: "#fff" }
                              : { background: "var(--surface-1)", color: "var(--muted)", border: "1px solid var(--line-soft)" }
                          }
                        >
                          Saya 18+
                        </button>
                      </div>
                      <p className="text-[11px] m-0 text-left" style={{ color: "var(--muted)" }}>
                        {adultAllowed
                          ? "Sumber komik 18+ ditampilkan (cover tetap diblur)."
                          : "Mode aman: sumber komik 18+ disembunyikan."}
                      </p>
                    </div>
                  )}

                  {index === 3 && (
                    <div className="w-full max-w-[300px] flex flex-col gap-2 mt-1">
                      {user ? (
                        <button
                          type="button"
                          onClick={close}
                          className="rk-btn-primary w-full h-11 rounded-[13px] font-extrabold text-[13px] flex items-center justify-center gap-2"
                        >
                          <FiCheck size={17} /> Mulai Baca
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={login}
                          className="w-full h-11 rounded-[13px] font-extrabold text-[13px] flex items-center justify-center gap-2.5 text-[#121522]"
                          style={{ background: "#fff", border: "1px solid #fff" }}
                        >
                          <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
                            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.5 13.8l7.9 6.1C12.4 13.9 17.7 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.6-4.8 7.3l7.6 5.9c4.4-4.1 7-10.1 7-17.7z" />
                            <path fill="#FBBC05" d="M10.4 28.1c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.1 0 19.9 0 24s1 7.9 2.5 11.2l7.9-7.1z" />
                            <path fill="#34A853" d="M24 47.5c6.2 0 11.5-2 15.3-5.6l-7.6-5.9c-2.1 1.4-4.8 2.3-7.7 2.3-6.3 0-11.6-4.4-13.6-10.3l-7.9 6.1C6.5 42.1 14.6 47.5 24 47.5z" />
                          </svg>
                          Masuk dengan Google
                        </button>
                      )}
                      <p className="text-[10.5px] m-0" style={{ color: "var(--muted-soft)" }}>
                        {user ? "Kamu sudah masuk." : "Boleh dilewati — baca tetap bisa tanpa akun."}
                      </p>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        {/* Navigasi */}
        <div className="flex items-center gap-2 px-5 pt-2 pb-4">
          <button
            type="button"
            onClick={() => go(slide - 1)}
            disabled={slide === 0}
            aria-label="Sebelumnya"
            className="rk-btn-ghost w-10 h-10 rounded-full grid place-items-center disabled:opacity-25 disabled:pointer-events-none"
          >
            <FiChevronLeft size={17} />
          </button>

          <div className="flex gap-1.5 flex-1 justify-center">
            {SLIDES.map((item, index) => (
              <button
                key={item.step}
                type="button"
                aria-label={`Slide ${index + 1}`}
                onClick={() => go(index)}
                className="h-1.5 rounded-full border-0 p-0 transition-all duration-300"
                style={{
                  width: index === slide ? 18 : 6,
                  background: index === slide ? "var(--accent)" : "rgba(255,255,255,.16)",
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => (isLast ? close() : go(slide + 1))}
            className="rk-btn-primary h-10 px-4 rounded-[12px] font-black text-[13px] text-white flex items-center gap-1"
          >
            {isLast ? "Selesai" : "Lanjut"}
            {!isLast && <FiChevronRight size={15} />}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function FirstRunOnboarding() {
  return (
    <SafeBoundary>
      <OnboardingInner />
    </SafeBoundary>
  );
}
