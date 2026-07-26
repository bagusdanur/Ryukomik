"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function InstallPWA() {
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

  if (!show) return null;

  return (
    <div className="fixed top-4 inset-x-0 z-[9999] flex justify-center px-3">
      <div className="relative w-full max-w-3xl bg-[#282828] text-white rounded-xl shadow-lg px-5 py-4 flex items-center gap-4">
        {/* Icon */}
        <Image
          src="/icon.png"
          alt="Ryukomik"
          width={40}
          height={40}
          className="h-10 w-10 rounded-lg"
        />

        {/* Text */}
        <div className="flex-1">
          <p className="font-semibold text-base">Install Ryukomik</p>
          <p className="text-sm text-gray-300">
            Baca komik lebih cepat, ringan & tanpa browser
          </p>
        </div>

        {/* Install Button */}
        <button
          onClick={installApp}
          className="bg-green-400 text-black px-4 py-2 rounded-lg font-bold hover:bg-green-300 transition"
        >
          Install
        </button>

        {/* Close (X) */}
        <button
          onClick={() => setShow(false)}
          className="absolute top-2 right-3 text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
