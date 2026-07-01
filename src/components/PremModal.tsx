"use client";

import { FiX, FiStar } from "react-icons/fi";

export default function PremiumModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="rk-card w-full max-w-sm rounded-3xl p-6">
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="text-white/30 hover:text-white transition">
            <FiX size={18} />
          </button>
        </div>
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-400/10">
            <FiStar size={32} className="text-cyan-200" />
          </div>
        </div>
        <h3 className="text-center text-lg font-bold text-white mb-2">Fitur Premium 💎</h3>
        <p className="text-center text-sm text-white/50 mb-6">
          Fitur ini tersedia khusus untuk member Premium. Upgrade sekarang dan nikmati akses penuh!
        </p>
        <a href="/premium-pay" className="rk-btn-primary mb-2 block w-full rounded-2xl py-3 text-center font-bold">
          Upgrade Premium
        </a>
        <button onClick={onClose} className="block w-full text-center text-sm text-white/30 hover:text-white py-2 transition">
          Nanti dulu
        </button>
      </div>
    </div>
  );
}
