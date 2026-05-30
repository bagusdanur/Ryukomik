"use client";

export default function AgeModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70">
      <div className="bg-[#1e1e1e] p-6 rounded-2xl w-[90%] max-w-sm border border-white/10 text-center">
        
        <h2 className="text-white text-lg font-semibold mb-3">
          Konten 18+
        </h2>

        <p className="text-white/70 text-sm mb-5">
          Kamu harus berusia 18 tahun atau lebih.
        </p>

        <button
          onClick={onConfirm}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl"
        >
          Saya 18+
        </button>

        <button
          onClick={onClose}
          className="w-full mt-2 text-white/60 text-sm hover:text-white"
        >
          Batal
        </button>

      </div>
    </div>
  );
}
