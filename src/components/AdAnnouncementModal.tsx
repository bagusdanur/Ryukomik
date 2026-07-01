"use client";

import { useState, useEffect } from "react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { RiMegaphoneLine, RiSparklingFill } from "react-icons/ri";

export default function AdAnnouncementModal() {
  const { loading, isPremium } = usePremiumStatus();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("ad_modal_seen");
    if (!seen) {
      requestAnimationFrame(() => {
        setOpen(true);
        setTimeout(() => setVisible(true), 10);
      });
    }
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(() => {
      localStorage.setItem("ad_modal_seen", "1");
      setOpen(false);
    }, 350);
  };

  if (loading || isPremium || !open) return null;

  return (
    <div
      onClick={(e: React.MouseEvent<HTMLDivElement>) =>
        e.target === e.currentTarget && close()
      }
      className={`fixed inset-0 z-[9999] flex items-end sm:items-center justify-center ${
        visible ? "bg-black/60" : "bg-black/0"
      }`}
    >
      <div
        className={`w-full sm:max-w-[420px] bg-[#1c1c1e] rounded-t-[28px] sm:rounded-[24px] border border-white/[0.08] overflow-hidden ${
          visible
            ? "translate-y-0 opacity-100 sm:scale-100"
            : "translate-y-full opacity-0 sm:scale-95 sm:translate-y-4"
        }`}
      >
        {/* Accent top bar */}
        <div className="h-[3px] bg-[var(--accent)]" />

        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pt-4 pb-8 sm:p-7">
          {/* Icon + label + title */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-[52px] h-[52px] rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center shrink-0">
              <RiMegaphoneLine size={26} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-widest text-[var(--accent)] uppercase mb-0.5">
                Pengumuman
              </p>
              <h2 className="text-[18px] font-bold text-white leading-tight">
                Ada iklan baru di sini
              </h2>
            </div>
          </div>

          {/* Body */}
          <p className="text-[14px] text-white/55 leading-relaxed mb-5">
            Mulai hari ini kami menampilkan iklan untuk membantu layanan ini
            tetap{" "}
            <span className="text-white/80 font-medium">gratis</span>. Kami
            mohon maaf atas ketidaknyamanan ini.
          </p>

          {/* Premium callout */}
          <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/25 rounded-[14px] p-4 mb-5 flex items-start gap-3">
            <div className="w-8 h-8 bg-[var(--accent)]/20 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5">
              <RiSparklingFill size={17} className="text-[#a68fff]" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#a68fff] mb-0.5">
                Hapus iklan selamanya
              </p>
              <p className="text-[13px] text-white/50 leading-relaxed">
                Upgrade ke Premium dan nikmati pengalaman bersih tanpa gangguan
                iklan.
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2.5">
            <a
              href="/premium-pay"
              className="flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent)] active:scale-[0.98] text-white font-semibold text-[15px] py-[15px] rounded-[14px] no-underline tracking-[0.01em]"
            >
              <RiSparklingFill size={16} />
              Upgrade ke Premium
            </a>
            <button
              onClick={close}
              className="w-full bg-white/5 hover:bg-white/10 active:scale-[0.98] border border-white/10 text-white/40 hover:text-white/60 font-medium text-[14px] py-[14px] rounded-[14px] cursor-pointer"
            >
              Oke, Mengerti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
