"use client";

import { useEffect, useState } from "react";

type MaintenancePhase = "normal" | "upcoming" | "active";

type MaintenanceBannerProps = {
  startHour?: number;
  endHour?: number;
  timezone?: string;
};

export default function MaintenanceBanner({
  startHour = 16,
  endHour = 17,
  timezone = "Asia/Jakarta",
}: MaintenanceBannerProps) {
  const [phase, setPhase] = useState<MaintenancePhase>("normal");
  const [timeLeft, setTimeLeft] = useState("");
  const [popupDismissed, setPopupDismissed] = useState(false);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const jakartaStr = now.toLocaleString("en-US", { timeZone: timezone });
      const jakarta = new Date(jakartaStr);
      const h = jakarta.getHours();
      const m = jakarta.getMinutes();
      const s = jakarta.getSeconds();
      const totalSec = h * 3600 + m * 60 + s;

      const startSec = startHour * 3600;
      const endSec = endHour * 3600;
      const warnSec = startSec - 60 * 60;

      const fmt = (diff: number) => {
        const hh = Math.floor(diff / 3600);
        const mm = Math.floor((diff % 3600) / 60);
        const ss = diff % 60;
        if (hh > 0) return `${hh}j ${mm}m ${String(ss).padStart(2, "0")}d`;
        return `${mm}m ${String(ss).padStart(2, "0")}d`;
      };

      if (totalSec >= warnSec && totalSec < startSec) {
        setPhase("upcoming");
        setTimeLeft(fmt(startSec - totalSec));
      } else if (totalSec >= startSec && totalSec < endSec) {
        setPhase("active");
        setPopupDismissed(false);
        setTimeLeft(fmt(endSec - totalSec));
      } else {
        setPhase("normal");
      }
    };

    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [startHour, endHour, timezone]);

  if (phase === "normal") return null;

  // ─── UPCOMING ────────────────────────────────────────────────────────────────
  if (phase === "upcoming") {
    if (popupDismissed) return null;

    return (
      <div
        className="fixed inset-0 z-100 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(20,18,26,0.75)", backdropFilter: "blur(6px)" }}
      >
        <div
          className="rounded-2xl w-full max-w-md overflow-hidden"
          style={{ backgroundColor: "#282828", border: "1px solid rgba(125,95,255,0.35)" }}
        >
          {/* Top accent bar */}
          <div className="h-1 w-full" style={{ background: "#7d5fff" }} />

          {/* Header */}
          <div
            className="px-6 py-5 flex items-center gap-3"
            style={{ borderBottom: "1px solid rgba(125,95,255,0.2)" }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: "rgba(125,95,255,0.2)" }}
            >
              📢
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight" style={{ color: "#e2dcff" }}>
                Ryukomik — Maintenance Sebentar Lagi
              </h2>
              <p className="text-sm" style={{ color: "rgba(162,140,255,0.7)" }}>
                Tenang, komikmu tidak akan kemana-mana 📖
              </p>
            </div>
          </div>

          {/* Illustration */}
          <div className="flex justify-center pt-6 pb-2">
            <svg width="130" height="105" viewBox="0 0 130 105" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Monitor body */}
              <rect x="18" y="14" width="84" height="54" rx="6" fill="#1e1b2e" stroke="#7d5fff" strokeWidth="2"/>
              <rect x="25" y="21" width="70" height="40" rx="3" fill="#252035"/>
              <ellipse cx="60" cy="41" rx="22" ry="16" fill="#7d5fff" opacity="0.07"/>
              {/* Warning triangle on screen */}
              <path d="M60 30 L71 50 L49 50 Z" fill="rgba(125,95,255,0.25)" stroke="#7d5fff" strokeWidth="1.5" strokeLinejoin="round"/>
              <rect x="59" y="37" width="2" height="6" rx="1" fill="#a78fff"/>
              <rect x="59" y="45" width="2" height="2" rx="1" fill="#a78fff"/>
              {/* Monitor stand */}
              <rect x="54" y="68" width="12" height="6" rx="1.5" fill="#3d3560"/>
              <rect x="44" y="74" width="32" height="4" rx="2" fill="#4a3f7a"/>
              {/* Clock floating */}
              <circle cx="106" cy="22" r="11" fill="#1e1b2e" stroke="#7d5fff" strokeWidth="1.5"/>
              <circle cx="106" cy="22" r="7" fill="#252035"/>
              <line x1="106" y1="16" x2="106" y2="22" stroke="#7d5fff" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="106" y1="22" x2="111" y2="22" stroke="#a78fff" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="106" cy="22" r="1.5" fill="#7d5fff"/>
              {/* Floating dots */}
              <circle cx="14" cy="32" r="3" fill="#7d5fff" opacity="0.4"/>
              <circle cx="9" cy="52" r="2" fill="#7d5fff" opacity="0.25"/>
              <circle cx="116" cy="58" r="2.5" fill="#7d5fff" opacity="0.3"/>
              <circle cx="22" cy="72" r="1.5" fill="#a78fff" opacity="0.35"/>
            </svg>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4">
            <p className="text-sm leading-relaxed" style={{ color: "rgba(210,205,255,0.75)" }}>
              Hei, Reader! Ryukomik akan melakukan{" "}
              <span className="font-semibold" style={{ color: "#e2dcff" }}>
                pemeliharaan server
              </span>{" "}
              pada:
            </p>

            <div
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: "rgba(125,95,255,0.1)", border: "1px solid rgba(125,95,255,0.25)" }}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#7d5fff" }}>
                  Jadwal Maintenance
                </p>
                <p className="font-bold text-base mt-0.5" style={{ color: "#c4b5fd" }}>
                  {startHour}.00 – {endHour}.00 WIB
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#7d5fff" }}>
                  Dimulai dalam
                </p>
                <p className="font-bold text-2xl font-mono tabular-nums mt-0.5" style={{ color: "#a78fff" }}>
                  {timeLeft}
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: "rgba(162,140,255,0.5)" }}>
              Sementara menunggu, kamu bisa menyimpan chapter favoritmu dulu ya. Setelah maintenance selesai, semua komik bisa dibaca kembali seperti biasa! 🎉
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6">
            <button
              onClick={() => setPopupDismissed(true)}
              className="w-full font-semibold text-sm py-3 rounded-xl"
              style={{ backgroundColor: "#7d5fff", color: "#fff" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#6b4fe0")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#7d5fff")}
            >
              Siap, Mengerti!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── ACTIVE ──────────────────────────────────────────────────────────────────
  if (phase === "active") {
    return (
      <div
        className="fixed inset-0 z-100 flex items-center justify-center p-4"
        style={{ backgroundColor: "#181620" }}
      >
        <div
          className="relative rounded-2xl w-full max-w-md overflow-hidden"
          style={{ backgroundColor: "#282828", border: "1px solid rgba(125,95,255,0.3)" }}
        >
          {/* Top accent bar */}
          <div
            className="h-1 w-full"
            style={{ background: "#7d5fff" }}
          />

          {/* SVG Illustration */}
          <div className="flex justify-center pt-6 pb-2">
            <svg width="130" height="95" viewBox="0 0 130 95" fill="none" xmlns="http://www.w3.org/2000/svg">
              <style>{`
                @keyframes spinCW  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes spinCCW { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
                .gear-cw  { transform-box: fill-box; transform-origin: center; animation: spinCW  6s linear infinite; }
                .gear-ccw { transform-box: fill-box; transform-origin: center; animation: spinCCW 4s linear infinite; }
              `}</style>
              <g className="gear-cw">
                <circle cx="55" cy="44" r="18" fill="#1e1b2e" stroke="#7d5fff" strokeWidth="2"/>
                <circle cx="55" cy="44" r="8" fill="#282828" stroke="#7d5fff" strokeWidth="1.5"/>
                <rect x="52" y="20" width="6" height="9" rx="2" fill="#7d5fff"/>
                <rect x="52" y="59" width="6" height="9" rx="2" fill="#7d5fff"/>
                <rect x="31" y="41" width="9" height="6" rx="2" fill="#7d5fff"/>
                <rect x="70" y="41" width="9" height="6" rx="2" fill="#7d5fff"/>
                <rect x="37" y="26" width="9" height="6" rx="2" fill="#7d5fff" transform="rotate(45 37 26)"/>
                <rect x="64" y="56" width="9" height="6" rx="2" fill="#7d5fff" transform="rotate(45 64 56)"/>
                <rect x="37" y="56" width="9" height="6" rx="2" fill="#7d5fff" transform="rotate(-45 37 56)"/>
                <rect x="64" y="26" width="9" height="6" rx="2" fill="#7d5fff" transform="rotate(-45 64 26)"/>
              </g>
              <g className="gear-ccw">
                <circle cx="88" cy="28" r="11" fill="#1e1b2e" stroke="#a78fff" strokeWidth="1.5"/>
                <circle cx="88" cy="28" r="5" fill="#282828" stroke="#a78fff" strokeWidth="1.5"/>
                <rect x="85" y="13" width="4" height="7" rx="1.5" fill="#a78fff" transform="rotate(0 88 28)"/>
                <rect x="85" y="13" width="4" height="7" rx="1.5" fill="#a78fff" transform="rotate(60 88 28)"/>
                <rect x="85" y="13" width="4" height="7" rx="1.5" fill="#a78fff" transform="rotate(120 88 28)"/>
                <rect x="85" y="13" width="4" height="7" rx="1.5" fill="#a78fff" transform="rotate(180 88 28)"/>
                <rect x="85" y="13" width="4" height="7" rx="1.5" fill="#a78fff" transform="rotate(240 88 28)"/>
                <rect x="85" y="13" width="4" height="7" rx="1.5" fill="#a78fff" transform="rotate(300 88 28)"/>
              </g>
              <g transform="translate(22,58) rotate(-35)">
                <rect x="0" y="0" width="7" height="26" rx="3.5" fill="#3d3560"/>
                <rect x="-2.5" y="0" width="12" height="8" rx="3" fill="#4a3f7a"/>
                <rect x="-2.5" y="18" width="12" height="8" rx="3" fill="#4a3f7a"/>
              </g>
              <circle cx="30" cy="22" r="2.5" fill="#c4b5fd" opacity="0.8"/>
              <circle cx="22" cy="38" r="1.5" fill="#c4b5fd" opacity="0.5"/>
              <circle cx="108" cy="50" r="2" fill="#c4b5fd" opacity="0.6"/>
              <circle cx="115" cy="36" r="1.5" fill="#c4b5fd" opacity="0.4"/>
              <rect x="20" y="80" width="90" height="5" rx="2.5" fill="#1e1b2e"/>
              <rect x="20" y="80" width="40" height="5" rx="2.5" fill="#7d5fff" opacity="0.8">
                <animate attributeName="width" values="10;80;10" dur="2.5s" repeatCount="indefinite"/>
              </rect>
            </svg>
          </div>

          {/* Title */}
          <div className="px-6 pb-4 text-center">
            <h2 className="font-bold text-xl" style={{ color: "#e2dcff" }}>
              Ryukomik Lagi Maintenance 🛠️
            </h2>
            <p className="text-sm mt-1" style={{ color: "rgba(162,140,255,0.6)" }}>
              Server sedang diperbaiki agar komikmu makin lancar dibaca!
            </p>
          </div>

          {/* Timer */}
          <div
            className="mx-6 mb-4 rounded-xl px-4 py-4 text-center"
            style={{ backgroundColor: "rgba(125,95,255,0.1)", border: "1px solid rgba(125,95,255,0.25)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#7d5fff" }}>
              Estimasi selesai dalam
            </p>
            <p className="text-4xl font-bold font-mono tabular-nums" style={{ color: "#a78fff" }}>
              {timeLeft}
            </p>
            <p className="text-xs mt-1" style={{ color: "rgba(162,140,255,0.4)" }}>
              Selesai pukul {endHour}.00 WIB — sambil nunggu, istirahat dulu ya! ☕
            </p>
          </div>

          {/* Info list */}
          <div className="mx-6 mb-6 space-y-2">
            {[
              {
                text: "Optimasi kecepatan loading chapter",
                icon: (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#7d5fff" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                ),
              },
              {
                text: "Penambahan komik & chapter terbaru",
                icon: (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#7d5fff" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                  </svg>
                ),
              },
              {
                text: "Perbaikan bug & peningkatan stabilitas",
                icon: (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#7d5fff" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                ),
              },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm" style={{ color: "rgba(196,181,253,0.7)" }}>
                {item.icon}
                {item.text}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4" style={{ borderTop: "1px solid rgba(125,95,255,0.15)" }}>
            <p className="text-center text-xs" style={{ color: "rgba(125,95,255,0.45)" }}>
              Ryukomik akan kembali normal setelah maintenance selesai. Terima kasih sudah sabar, Reader! 🙏
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
