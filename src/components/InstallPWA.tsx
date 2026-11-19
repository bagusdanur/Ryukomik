"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FiX } from "react-icons/fi";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function InstallPWA() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Tampil SELAMA belum install
      if (!localStorage.getItem("pwaInstalled")) {
        setShow(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      localStorage.setItem("pwaInstalled", "yes");
      setShow(false); // hilang permanen
    }
  };

  // Jangan tampilkan ajakan install di halaman dewasa /tonton: dialog install
  // Android (WebAPK) memunculkan permintaan izin "mengakses aplikasi dan layanan
  // lain di perangkat ini", yang mengganggu di section 18+.
  // Banner install tidak ditampilkan di halaman yang butuh fokus baca/profil.
  if (
    pathname?.startsWith("/hentai") ||
    pathname?.startsWith("/tonton") ||
    pathname?.startsWith("/scanlator") ||
    /^\/komik\/[^/]+\/[^/]+\/?$/.test(pathname || "")
  ) {
    return null;
  }
  if (!show) return null;

  return (
    <div className="fixed top-3 inset-x-0 z-[9999] flex justify-center px-3">
      <div className="rk-card relative flex w-full max-w-2xl items-center gap-3 rounded-2xl px-4 py-3 shadow-xl shadow-black/40 sm:gap-4 sm:px-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]">
          <Image src="/icon.png" alt="Ryukomik" width={28} height={28} className="h-7 w-7 rounded-lg" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-black leading-tight text-white sm:text-sm">Install Ryukomik</p>
          <p className="mt-0.5 truncate text-[11px] text-white/55 sm:text-xs">
            Baca lebih cepat, ringan & tanpa browser
          </p>
        </div>

        <button
          onClick={installApp}
          className="rk-btn-primary shrink-0 rounded-xl px-4 py-2 text-xs font-black"
        >
          Install
        </button>

        <button
          onClick={() => setShow(false)}
          aria-label="Tutup"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/40 transition hover:bg-white/5 hover:text-white"
        >
          <FiX size={16} />
        </button>
      </div>
    </div>
  );
}
