"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import {
  FiBell,
  FiBookOpen,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiLock,
  FiShield,
} from "react-icons/fi";
import { AuthContext } from "@/components/auth/AuthProvider";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { ADULT_PREF_KEY, isAdultHidden, setAdultHidden } from "@/utils/adultFilter";
import { grantAdultConsent, revokeAdultConsent } from "@/utils/adultConsent";
import { isPushSupported, subscribePush } from "@/utils/pushSubscription";

/**
 * Layar awal gaya "aplikasi baru di-install":
 * Slide 1: Selamat datang
 * Slide 2: Pengaturan Notifikasi
 * Slide 3: Pengaturan Konten 18+ (tersambung ke filter 18+ Ryukomik)
 * Slide 4: Wajib Masuk (Google OAuth)
 *
 * Muncul sekali per perangkat (`rk-onboarding-v1`). Setelah onboarding selesai,
 * pengunjung yang belum login langsung diarahkan ke Slide 4 (gerbang login).
 */

const STORAGE_KEY = "rk-onboarding-v1";
const PENDING_NOTIF_KEY = "rk-onboarding-notif";
const OVERLAY_ID = "rk-onboarding-gate";
const Z_INDEX = 2147482500;

const EXEMPT_PREFIXES = ["/auth", "/privacy-policy", "/aturan", "/dmca", "/ads"];

type Phase = "loading" | "onboarding" | "gate" | "ready";

type Slide = {
  step: string;
  icon: typeof FiBookOpen;
  tone: "violet" | "cyan" | "rose";
  title: string;
  body: React.ReactNode;
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
        tempat dengan tampilan cepat dan rapi.
      </>
    ),
  },
  {
    step: "Langkah 2 dari 4",
    icon: FiBell,
    tone: "cyan",
    title: "Aktifkan Notifikasi",
    body: <>Jangan lewatkan update chapter baru dari seri yang kamu ikuti.</>,
  },
  {
    step: "Langkah 3 dari 4",
    icon: FiShield,
    tone: "rose",
    title: "Filter Konten 18+",
    body: (
      <>
        Atur preferensi umur kamu. Halaman Hentai sudah <b className="text-white font-extrabold">dinonaktifkan</b>,
        dan filter ini mengatur tampilan sumber komik 18+.
      </>
    ),
  },
  {
    step: "Langkah 4 dari 4",
    icon: FiLock,
    tone: "violet",
    title: "Masuk untuk Mulai",
    body: (
      <>
        Mulai sekarang <b className="text-white font-extrabold">wajib masuk akun</b>. Bookmark,
        riwayat baca, dan pengaturan tersimpan otomatis di akunmu.
      </>
    ),
  },
];

const TONE: Record<Slide["tone"], string> = {
  violet: "rgba(139,92,246,.20)",
  cyan: "rgba(34,211,238,.16)",
  rose: "rgba(244,63,94,.16)",
};

export default function AppOnboarding({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const { user: localUser, loading: localLoading } = useContext(AuthContext);
  const { user: supaUser, loading: supaLoading } = useSupabaseUser();

  const activeUser = localUser || supaUser;
  const authLoading = localLoading && supaLoading;

  const [phase, setPhase] = useState<Phase>("loading");
  const [mounted, setMounted] = useState(false);
  const [slide, setSlide] = useState(0);
  const [notif, setNotif] = useState(false);
  const [adultAllowed, setAdultAllowed] = useState(false);
  const [status, setStatus] = useState("");
  const drag = useRef({ start: 0, delta: 0, active: false });

  useEffect(() => {
    setMounted(true);
    try {
      const hasPref = localStorage.getItem(ADULT_PREF_KEY) !== null;
      if (hasPref) {
        setAdultAllowed(!isAdultHidden());
      } else {
        // Default aman untuk perangkat baru: sembunyikan 18+ sampai diaktifkan.
        setAdultHidden(true);
        setAdultAllowed(false);
      }
      if (typeof window !== "undefined" && "Notification" in window) {
        setNotif(Notification.permission === "granted");
      }
    } catch {
      /* abaikan error storage */
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let seen = false;
    try {
      seen = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      seen = false;
    }

    if (!seen) {
      setPhase("onboarding");
      return;
    }
    if (authLoading && !activeUser) {
      setPhase("loading");
      return;
    }
    if (activeUser) {
      setPhase("ready");
      // Bila saat onboarding user meminta notifikasi sebelum login, daftarkan sekarang.
      try {
        if (localStorage.getItem(PENDING_NOTIF_KEY) === "1" && isPushSupported()) {
          localStorage.removeItem(PENDING_NOTIF_KEY);
          void subscribePush(activeUser.id);
        }
      } catch {
        /* abaikan */
      }
    } else {
      setSlide(SLIDES.length - 1);
      setPhase("gate");
    }
  }, [mounted, authLoading, activeUser]);

  const applyAdultPreference = useCallback((allow: boolean) => {
    setAdultAllowed(allow);
    setAdultHidden(!allow);
    if (allow) {
      grantAdultConsent();
    } else {
      revokeAdultConsent();
    }
  }, []);

  const persistOnboardingDone = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
      if (!notif) {
        localStorage.setItem("notif-prompt-dismissed", String(Date.now()));
      }
    } catch {
      /* storage bisa diblokir browser */
    }
  }, [notif]);

  const handleGoogleLogin = useCallback(() => {
    persistOnboardingDone();
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/api/auth/google/start?next=${next}`;
  }, [persistOnboardingDone]);

  const finish = useCallback(() => {
    persistOnboardingDone();
    if (activeUser) {
      setPhase("ready");
    } else {
      setSlide(SLIDES.length - 1);
      setPhase("gate");
    }
  }, [activeUser, persistOnboardingDone]);

  const go = useCallback((next: number) => {
    setSlide((current) => Math.max(0, Math.min(SLIDES.length - 1, next)));
  }, []);

  const askNotif = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setStatus("Browser perangkat ini tidak mendukung notifikasi.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === "granted";
      setNotif(granted);
      if (granted) {
        try {
          if (activeUser?.id && isPushSupported()) {
            await subscribePush(activeUser.id);
          } else {
            localStorage.setItem(PENDING_NOTIF_KEY, "1");
          }
        } catch {
          /* abaikan */
        }
      }
      setStatus(
        granted
          ? "Notifikasi aktif. Kamu akan mendapat info chapter baru."
          : permission === "denied"
            ? "Izin notifikasi diblokir browser. Aktifkan lewat pengaturan browser."
            : "Notifikasi belum diizinkan.",
      );
    } catch {
      setStatus("Izin notifikasi tidak dapat diminta di perangkat ini.");
    }
  }, [activeUser?.id]);

  // Geser sentuh / mouse
  const onStart = (x: number) => {
    if (phase === "gate") return;
    drag.current = { start: x, delta: 0, active: true };
  };
  const onMove = (x: number) => {
    if (!drag.current.active || phase === "gate") return;
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

  const isExempt = EXEMPT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!mounted || isExempt || phase === "loading" || phase === "ready") {
    return <>{children}</>;
  }

  const activeSlide = phase === "gate" ? SLIDES.length - 1 : slide;
  const isLast = activeSlide === SLIDES.length - 1;

  return (
    <>
      {children}
      {createPortal(
        <div
          id={OVERLAY_ID}
          style={{ zIndex: Z_INDEX }}
          className="fixed inset-0 flex items-center justify-center px-4 py-5"
        >
          <div
            className="absolute inset-0 backdrop-blur-md"
            style={{
              background:
                "radial-gradient(900px 520px at 12% -8%, rgba(139,92,246,.20), transparent 60%), radial-gradient(800px 500px at 92% 108%, rgba(34,211,238,.12), transparent 60%), rgba(9,10,18,.94)",
            }}
          />

          <div
            className="rk-card relative w-full max-w-[388px] rounded-[26px] overflow-hidden flex flex-col"
            style={{
              background: "var(--surface-0)",
              borderColor: "var(--line-soft)",
              boxShadow: "0 28px 75px rgba(0,0,0,.65)",
              minHeight: 520,
              maxHeight: "92vh",
            }}
          >
            {/* Bar atas */}
            <div className="flex items-center justify-between px-5 pt-4">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-black text-white"
                  style={{ background: "var(--accent)" }}
                >
                  R
                </span>
                <span className="text-[15px] font-black tracking-tight text-white">
                  Ryukomik<span style={{ color: "var(--accent-2)" }}>.</span>
                </span>
              </div>
              {!isLast && phase === "onboarding" && (
                <button
                  type="button"
                  onClick={() => go(SLIDES.length - 1)}
                  className="text-[12px] font-bold px-2.5 py-1 rounded-lg transition hover:text-white"
                  style={{ color: "var(--muted)" }}
                >
                  Lewati
                </button>
              )}
            </div>

            <div className="h-[2px] mx-5 mt-3 rounded-full" style={{ background: "rgba(255,255,255,.07)" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${((activeSlide + 1) / SLIDES.length) * 100}%`,
                  background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                }}
              />
            </div>

            {/* Isi slide */}
            <div
              className="flex-1 overflow-hidden flex items-center"
              style={{ touchAction: "pan-y" }}
              onTouchStart={(event) => onStart(event.touches[0].clientX)}
              onTouchMove={(event) => onMove(event.touches[0].clientX)}
              onTouchEnd={onEnd}
              onMouseDown={(event) => onStart(event.clientX)}
              onMouseMove={(event) => onMove(event.clientX)}
              onMouseUp={onEnd}
              onMouseLeave={onEnd}
            >
              <div
                className="flex w-full transition-transform duration-300"
                style={{
                  transform: `translateX(calc(-${activeSlide * 100}% + ${drag.current.delta}px))`,
                  transitionProperty: drag.current.active ? "none" : "transform",
                }}
              >
                {SLIDES.map((item, index) => {
                  const ItemIcon = item.icon;
                  return (
                    <section
                      key={item.step}
                      className="min-w-full flex flex-col items-center justify-center text-center gap-3 px-6 py-6"
                    >
                      <div
                        className="w-[116px] h-[116px] rounded-[28px] grid place-items-center"
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
                        <ItemIcon size={48} strokeWidth={1.6} />
                      </div>

                      <div
                        className="text-[10px] font-extrabold uppercase mt-1"
                        style={{ color: "var(--accent-2)", letterSpacing: ".14em" }}
                      >
                        {phase === "gate" ? "Akses Akun" : item.step}
                      </div>

                      <h1 className="text-[22px] leading-[1.18] font-black tracking-tight text-white m-0">
                        {item.title}
                      </h1>

                      <p className="text-[13.5px] leading-[1.55] m-0 max-w-[295px]" style={{ color: "var(--muted)" }}>
                        {item.body}
                      </p>

                      {index === 0 && (
                        <div className="w-full max-w-[300px] grid grid-cols-3 gap-2 mt-2">
                          <div
                            className="rounded-xl px-2.5 py-2.5 text-center"
                            style={{ background: "var(--surface-1)", border: "1px solid var(--line-soft)" }}
                          >
                            <b className="block text-[12px] font-extrabold text-white">Komik HD</b>
                            <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                              Update harian
                            </span>
                          </div>
                          <div
                            className="rounded-xl px-2.5 py-2.5 text-center"
                            style={{ background: "var(--surface-1)", border: "1px solid var(--line-soft)" }}
                          >
                            <b className="block text-[12px] font-extrabold text-white">Anime</b>
                            <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                              Sub Indo
                            </span>
                          </div>
                          <div
                            className="rounded-xl px-2.5 py-2.5 text-center"
                            style={{ background: "var(--surface-1)", border: "1px solid var(--line-soft)" }}
                          >
                            <b className="block text-[12px] font-extrabold text-white">Sinkron</b>
                            <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                              Riwayat &amp; koleksi
                            </span>
                          </div>
                        </div>
                      )}

                      {index === 1 && (
                        <div className="w-full max-w-[300px] flex flex-col gap-2.5 items-center mt-1">
                          <label
                            className="w-full flex items-center justify-between gap-3 rounded-[14px] px-4 py-3 cursor-pointer"
                            style={{ background: "var(--surface-1)", border: "1px solid var(--line-soft)" }}
                          >
                            <span className="flex items-center gap-2.5 text-left">
                              <FiBell size={18} style={{ color: "var(--accent-2)" }} />
                              <span>
                                <b className="block text-[13px] font-extrabold text-white">Notifikasi Chapter</b>
                                <small className="text-[11px]" style={{ color: "var(--muted)" }}>
                                  Bookmark &amp; pengumuman
                                </small>
                              </span>
                            </span>
                            <input
                              type="checkbox"
                              checked={notif}
                              onChange={(event) => {
                                const next = event.target.checked;
                                setNotif(next);
                                if (next) void askNotif();
                              }}
                              className="rk-switch"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={askNotif}
                            className="rk-btn-ghost w-full h-11 rounded-[14px] font-extrabold text-[13px] flex items-center justify-center gap-2"
                          >
                            <FiBell size={16} /> Izinkan Notifikasi Browser
                          </button>
                          <div
                            className="w-full text-left text-[11.5px] leading-[1.45] rounded-xl px-3 py-2"
                            style={{
                              color: "var(--muted)",
                              background: "var(--surface-1)",
                              border: "1px solid var(--line-soft)",
                            }}
                          >
                            {status || "Bisa diatur kembali kapan saja di menu Pengaturan."}
                          </div>
                        </div>
                      )}

                      {index === 2 && (
                        <div className="w-full max-w-[300px] flex flex-col gap-2.5 items-center mt-1">
                          <div className="flex gap-2 w-full">
                            <button
                              type="button"
                              onClick={() => applyAdultPreference(false)}
                              className="flex-1 h-11 rounded-[14px] font-extrabold text-[13px] transition"
                              style={
                                !adultAllowed
                                  ? { background: "var(--accent)", color: "#fff" }
                                  : {
                                      background: "var(--surface-1)",
                                      color: "var(--muted)",
                                      border: "1px solid var(--line-soft)",
                                    }
                              }
                            >
                              Sembunyikan 18+
                            </button>
                            <button
                              type="button"
                              onClick={() => applyAdultPreference(true)}
                              className="flex-1 h-11 rounded-[14px] font-extrabold text-[13px] transition"
                              style={
                                adultAllowed
                                  ? { background: "var(--accent)", color: "#fff" }
                                  : {
                                      background: "var(--surface-1)",
                                      color: "var(--muted)",
                                      border: "1px solid var(--line-soft)",
                                    }
                              }
                            >
                              Saya 18+
                            </button>
                          </div>
                          <label
                            className="w-full flex items-center justify-between gap-3 rounded-[14px] px-4 py-3 cursor-pointer"
                            style={{ background: "var(--surface-1)", border: "1px solid var(--line-soft)" }}
                          >
                            <span className="flex items-center gap-2.5 text-left">
                              <FiShield size={18} style={{ color: "var(--accent-3)" }} />
                              <span>
                                <b className="block text-[13px] font-extrabold text-white">Tampilkan Sumber 18+</b>
                                <small className="text-[11px]" style={{ color: "var(--muted)" }}>
                                  Konfirmasi usia 18 tahun ke atas
                                </small>
                              </span>
                            </span>
                            <input
                              type="checkbox"
                              checked={adultAllowed}
                              onChange={(event) => applyAdultPreference(event.target.checked)}
                              className="rk-switch"
                            />
                          </label>
                          <div
                            className="w-full text-left text-[11.5px] leading-[1.45] rounded-xl px-3 py-2"
                            style={{
                              color: "var(--muted)",
                              background: "var(--surface-1)",
                              border: "1px solid var(--line-soft)",
                            }}
                          >
                            {adultAllowed
                              ? "Sumber komik 18+ diizinkan (cover tetap dilengkapi pelindung blur)."
                              : "Mode aman aktif: sumber komik 18+ disembunyikan dari daftar sumber."}
                          </div>
                        </div>
                      )}

                      {index === 3 && (
                        <div className="w-full max-w-[300px] flex flex-col gap-2.5 items-center mt-1">
                          {activeUser ? (
                            <button
                              type="button"
                              onClick={finish}
                              className="rk-btn-primary w-full h-12 rounded-[14px] font-extrabold text-[14px] flex items-center justify-center gap-2"
                            >
                              <FiCheck size={18} /> Lanjut ke Ryukomik
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleGoogleLogin}
                              className="w-full h-12 rounded-[14px] font-extrabold text-[14px] flex items-center justify-center gap-2.5 text-[#121522] transition active:scale-[0.98]"
                              style={{ background: "#fff", border: "1px solid #fff" }}
                            >
                              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                                <path
                                  fill="#EA4335"
                                  d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.5 13.8l7.9 6.1C12.4 13.9 17.7 9.5 24 9.5z"
                                />
                                <path
                                  fill="#4285F4"
                                  d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.6-4.8 7.3l7.6 5.9c4.4-4.1 7-10.1 7-17.7z"
                                />
                                <path
                                  fill="#FBBC05"
                                  d="M10.4 28.1c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.1 0 19.9 0 24s1 7.9 2.5 11.2l7.9-7.1z"
                                />
                                <path
                                  fill="#34A853"
                                  d="M24 47.5c6.2 0 11.5-2 15.3-5.6l-7.6-5.9c-2.1 1.4-4.8 2.3-7.7 2.3-6.3 0-11.6-4.4-13.6-10.3l-7.9 6.1C6.5 42.1 14.6 47.5 24 47.5z"
                                />
                              </svg>
                              Masuk dengan Google
                            </button>
                          )}
                          <p className="text-[11.5px] m-0" style={{ color: "var(--muted-soft)" }}>
                            Satu klik dengan akun Google untuk mulai membaca.
                          </p>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>

            {/* Indikator titik & navigasi bawah */}
            {phase === "onboarding" ? (
              <>
                <div className="flex gap-1.5 justify-center mb-3">
                  {SLIDES.map((item, index) => (
                    <button
                      key={item.step}
                      type="button"
                      aria-label={`Slide ${index + 1}`}
                      onClick={() => go(index)}
                      className="h-1.5 rounded-full border-0 p-0 transition-all duration-300"
                      style={{
                        width: index === activeSlide ? 22 : 6,
                        background: index === activeSlide ? "var(--accent)" : "rgba(255,255,255,.16)",
                      }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2.5 px-5 pb-5">
                  <button
                    type="button"
                    onClick={() => go(activeSlide - 1)}
                    disabled={activeSlide === 0}
                    aria-label="Sebelumnya"
                    className="rk-btn-ghost w-11 h-11 rounded-full grid place-items-center disabled:opacity-25 disabled:pointer-events-none"
                  >
                    <FiChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isLast) {
                        go(activeSlide + 1);
                      } else if (activeUser) {
                        finish();
                      } else {
                        handleGoogleLogin();
                      }
                    }}
                    className="rk-btn-primary flex-1 h-11 rounded-[14px] font-black text-[14px] tracking-wide text-white flex items-center justify-center gap-1.5"
                  >
                    {!isLast ? (
                      <>
                        Lanjut <FiChevronRight size={16} />
                      </>
                    ) : activeUser ? (
                      "Mulai Baca"
                    ) : (
                      "Masuk untuk Mulai"
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="px-5 pb-5 pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setSlide(0);
                    setPhase("onboarding");
                  }}
                  className="text-[11.5px] font-semibold transition hover:text-white"
                  style={{ color: "var(--muted-soft)" }}
                >
                  Atur ulang preferensi notifikasi &amp; 18+
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
