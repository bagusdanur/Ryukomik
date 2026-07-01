"use client";
import { useEffect, useState, useRef } from "react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import Link from "next/link";
import { FaBan, FaSync, FaCrown, FaTimes } from "react-icons/fa";
import { usePathname } from "next/navigation";

export default function AntiAdblock() {
  const { loading, isPremium } = usePremiumStatus();
  const [adblockDetected, setAdblockDetected] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const baitRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Cek jika halaman ini adalah halaman pembaca/chapter
  const isReaderPage = pathname?.startsWith("/chapter") || pathname?.startsWith("/hentai/episode");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = sessionStorage.getItem("adblock-dismissed");
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    }
  }, []);

  const checkAdblock = () => {
    if (baitRef.current) {
      const styles = window.getComputedStyle(baitRef.current);
      if (
        baitRef.current.offsetHeight === 0 ||
        baitRef.current.offsetWidth === 0 ||
        styles.display === "none" ||
        styles.visibility === "hidden"
      ) {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    // Jangan lakukan pengecekan jika masih loading atau jika user premium
    // Atau jika user berada di halaman premium / topup
    if (
      loading || 
      isPremium || 
      pathname?.startsWith("/premium") || 
      pathname?.startsWith("/premium-pay") || 
      pathname?.startsWith("/topup")
    ) {
      return;
    }

    const runCheck = () => {
      const detected = checkAdblock();
      if (detected) {
        setAdblockDetected(true);
        if (isReaderPage) {
          // Kunci scrolling halaman hanya jika di halaman reader (Hard Block)
          document.body.style.overflow = "hidden";
        }
      } else {
        setAdblockDetected(false);
        document.body.style.overflow = "";
      }
    };

    // Beri sedikit jeda agar DOM selesai dirender sebelum dicek
    const timer = setTimeout(() => {
      runCheck();
    }, 2000);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [loading, isPremium, pathname, isReaderPage]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("adblock-dismissed", "true");
    }
  };

  const handleRetry = () => {
    const stillDetected = checkAdblock();
    if (!stillDetected) {
      setAdblockDetected(false);
      document.body.style.overflow = "";
      alert("Terima kasih! Adblock tidak terdeteksi lagi.");
    } else {
      alert("Adblock masih aktif. Mohon nonaktifkan lalu coba lagi.");
    }
  };

  // Elemen pancingan (Bait) untuk dideteksi oleh Adblocker
  const baitElement = (
    <div
      ref={baitRef}
      className="ad-banner adsbox ad-placement doubleclick-ad"
      style={{
        position: "absolute",
        top: "-999px",
        left: "-999px",
        width: "1px",
        height: "1px",
        backgroundColor: "transparent",
      }}
      aria-hidden="true"
    />
  );

  if (!adblockDetected) {
    return baitElement;
  }

  // Tampilan layar kunci (Hard Block) khusus di halaman reader/chapter
  if (isReaderPage) {
    return (
      <>
        {baitElement}
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#090a12]/95 px-4 backdrop-blur-sm">
          <div className="flex w-full max-w-[400px] flex-col items-center rounded-2xl border border-white/10 bg-[#121522] p-8 text-center">
            
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <FaBan className="text-3xl" />
            </div>
            
            <h2 className="mb-2 text-xl font-bold text-white sm:text-2xl">
              Adblock Terdeteksi
            </h2>
            
            <p className="mb-8 text-sm leading-relaxed text-white/70">
              Iklan adalah satu-satunya cara kami membiayai server Ryukomik agar tetap beroperasi.
              Mohon matikan Adblock Anda untuk melanjutkan membaca chapter ini.
            </p>

            <div className="flex w-full flex-col gap-3">
              <button
                onClick={handleRetry}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black transition-colors hover:bg-gray-200"
              >
                <FaSync className="text-sm" />
                <span>Saya Sudah Matikan Adblock</span>
              </button>
              
              <Link
                href="/premium-pay"
                onClick={() => { document.body.style.overflow = ""; }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-400 transition-colors hover:bg-amber-500/20"
              >
                <FaCrown className="text-sm" />
                <span>Beli Premium (Tanpa Iklan)</span>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Tampilan Soft Warning (Floating bottom banner) di halaman selain reader
  if (isDismissed) {
    return baitElement;
  }

  return (
    <>
      {baitElement}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[380px] z-[9999] animate-[slideUp_0.3s_ease-out] rounded-2xl border border-white/10 bg-[#121522]/95 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-white/40 hover:text-white/75 transition-colors p-1"
          aria-label="Tutup"
        >
          <FaTimes size={14} />
        </button>
        <div className="flex gap-3 pr-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500 mt-0.5">
            <FaBan className="text-lg" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white mb-1">Adblock Terdeteksi</h4>
            <p className="text-xs text-white/60 leading-relaxed mb-4">
              Iklan membantu server Ryukomik tetap online. Mohon matikan adblock atau gunakan Premium untuk kenyamanan ekstra.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRetry}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-black hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <FaSync className="text-[10px]" />
                <span>Coba Lagi</span>
              </button>
              <Link
                href="/premium-pay"
                className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-colors"
              >
                <FaCrown className="text-[10px]" />
                <span>Premium</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
