"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Terbaru Error Boundary:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-md text-center">
        <h2 className="text-xl font-bold text-red-500 mb-2">Terjadi Kesalahan</h2>
        <p className="text-white/70 mb-6">
          Maaf, terjadi kesalahan saat memuat halaman ini.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
