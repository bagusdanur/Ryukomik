"use client";

import { useEffect, useState, useRef } from "react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import Link from "next/link";
import { FaBan, FaSync, FaCrown } from "react-icons/fa";

export default function AntiAdblock() {
  const { loading, isPremium } = usePremiumStatus();
  const [adblockDetected, setAdblockDetected] = useState(false);
  const baitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Jangan lakukan pengecekan jika masih loading atau jika user premium
    if (loading || isPremium) return;

    let detected = false;

    const checkAdblock = async () => {
      // 1. Deteksi DOM (Kosmetik) - uBlock Origin, Adblock Plus
      // Adblocker jadul seringkali menyembunyikan elemen dengan class "ad-banner" atau "adsbox"
      if (baitRef.current) {
        const styles = window.getComputedStyle(baitRef.current);
        if (
          baitRef.current.offsetHeight === 0 ||
          baitRef.current.offsetWidth === 0 ||
          styles.display === "none" ||
          styles.visibility === "hidden"
        ) {
          detected = true;
        }
      }

      // 2. Deteksi Network / DNS (Brave Browser, AdGuard DNS, 1.1.1.1)
      // Coba nge-fetch script Monetag yang terkenal sering diblokir DNS.
      // Jika fetch melempar error (karena gagal resolve atau diblokir), berarti ada Adblocker level DNS.
      if (!detected) {
        try {
          // Kita fetch dengan method HEAD agar cepat dan tidak mengunduh isi file
          // Tambahkan timestamp agar tidak membaca cache lokal
          await fetch(`https://al5sm.com/tag.min.js?_cb=${Date.now()}`, {
            method: "HEAD",
            mode: "no-cors",
            cache: "no-store"
          });
        } catch (err) {
          // fetch error = diblokir oleh browser / DNS
          detected = true;
        }
      }

      if (detected) {
        setAdblockDetected(true);
        // Kunci scrolling halaman
        document.body.style.overflow = "hidden";
      }
    };

    // Beri sedikit jeda agar DOM selesai dirender sebelum dicek
    const timer = setTimeout(() => {
      void checkAdblock();
    }, 1500);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [loading, isPremium]);

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

  // Tampilan layar kunci (Hard Block)
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
            Mohon matikan Adblock Anda untuk melanjutkan.
          </p>

          <div className="flex w-full flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black transition-colors hover:bg-gray-200"
            >
              <FaSync className="text-sm" />
              <span>Muat Ulang Halaman</span>
            </button>
            
            <Link
              href="/premium"
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
