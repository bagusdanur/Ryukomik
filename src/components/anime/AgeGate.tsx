"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "ryukomik_age_verified";

export default function AgeGate() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const verified = sessionStorage.getItem(STORAGE_KEY);
    if (!verified) {
      // slight delay biar halaman kerender dulu
      const t = setTimeout(() => setVisible(true), 80);
      return () => clearTimeout(t);
    }
  }, []);

  const handleConfirm = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setLeaving(true);
    setTimeout(() => setVisible(false), 400);
  };

  const handleDeny = () => {
    router.push("/anime/terbaru");
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4"
      style={{
        background: "rgba(0,0,0,0.85)",
        opacity: leaving ? 0 : 1,
      }}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: "#1a1a1a",
          border: "1px solid rgba(255,80,120,0.2)",
          transform: leaving ? "translateY(40px)" : "translateY(0)",
        }}
      >
        {/* top accent bar */}
        <div
          className="h-1 w-full flex-shrink-0"
          style={{ background: "#ff5078" }}
        />

        {/* body */}
        <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-5">
          {/* badge besar */}
          <div className="relative flex items-center justify-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "#ff5078",
              }}
            >
              <span
                className="text-[22px] font-black text-white leading-none"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                18+
              </span>
            </div>
          </div>

          {/* teks */}
          <div className="text-center flex flex-col gap-2">
            <h2
              className="text-[18px] font-black text-white leading-tight"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Konten Dewasa
            </h2>
            <p className="text-[12px] text-white/40 leading-relaxed">
              Halaman ini mengandung konten khusus untuk usia{" "}
              <span className="text-[#ff5078] font-bold">18 tahun ke atas</span>.
              Pastikan kamu memenuhi syarat umur sebelum melanjutkan.
            </p>
          </div>

          {/* divider */}
          <div className="w-full border-t border-white/5" />

          {/* konfirmasi */}
          <p
            className="text-[11px] text-white/25 text-center tracking-wide"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Apakah kamu berusia 18 tahun atau lebih?
          </p>

          {/* buttons */}
          <div className="w-full flex flex-col gap-2">
            <button
              onClick={handleConfirm}
              className="w-full h-12 rounded-xl font-black text-[13px] text-white active:scale-95"
              style={{
                fontFamily: "'Syne', sans-serif",
                background: "#ff5078",
              }}
            >
              Ya, Saya 18+ — Lanjutkan
            </button>
            <button
              onClick={handleDeny}
              className="w-full h-10 rounded-xl font-bold text-[12px] text-white/30 hover:text-white/50 active:scale-95 border border-white/5"
              style={{
                fontFamily: "'Syne', sans-serif",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              Tidak, Kembali ke Anime
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
