"use client";

import { useEffect, useState } from "react";

export default function DraftPreviewImages({ images, chapter, previewToken }: { images: string[]; chapter: string; previewToken: string }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const issueAccess = async () => {
      try {
        const response = await fetch("/api/image-session", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ context: "public-draft-preview", chapter, previewToken }),
        });
        if (!response.ok) throw new Error(`image session ${response.status}`);
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    void issueAccess();
    return () => { cancelled = true; };
  }, [chapter, previewToken]);

  if (!images.length) return <p className="p-12 text-center text-sm text-white/50">Draft ini belum memiliki gambar.</p>;
  if (!ready) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center px-6 text-center text-sm text-white/60">
        {failed ? (
          <button type="button" onClick={() => window.location.reload()} className="rounded-lg border border-white/15 px-4 py-2 text-white/80">
            Akses gambar gagal. Ketuk untuk mencoba lagi.
          </button>
        ) : "Menyiapkan gambar preview..."}
      </div>
    );
  }

  return images.map((url, index) => (
    <img
      key={`${url}:${index}`}
      src={url}
      alt={`Halaman ${index + 1}`}
      className="block h-auto w-full"
      loading={index < 2 ? "eager" : "lazy"}
      referrerPolicy="no-referrer"
    />
  ));
}
