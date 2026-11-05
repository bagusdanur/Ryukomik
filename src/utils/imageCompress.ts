"use client";

/**
 * Kompres gambar di browser sebelum upload.
 *
 * Kenapa: gambar scanlation sering 3–8 MB. Upload 50+ file mentah memakan
 * kuota, data pengguna, dan waktu. Kompres ke WebP maks 1600px biasanya
 * memotong 60–85% ukuran tanpa beda kasat mata di layar HP.
 */
export type CompressResult = { file: File; originalBytes: number; finalBytes: number };

const MAX_EDGE = 1600;
const QUALITY = 0.85;
// Di bawah ini tidak perlu dikompres (sudah kecil).
const SKIP_UNDER_BYTES = 350 * 1024;

export async function compressImage(file: File): Promise<CompressResult> {
  const originalBytes = file.size;
  if (!file.type.startsWith("image/") || originalBytes <= SKIP_UNDER_BYTES) {
    return { file, originalBytes, finalBytes: originalBytes };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { file, originalBytes, finalBytes: originalBytes };
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", QUALITY),
    );
    if (!blob || blob.size >= originalBytes) {
      return { file, originalBytes, finalBytes: originalBytes };
    }

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return {
      file: new File([blob], name, { type: "image/webp" }),
      originalBytes,
      finalBytes: blob.size,
    };
  } catch {
    // Gagal kompres (format aneh) → kirim apa adanya.
    return { file, originalBytes, finalBytes: originalBytes };
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
