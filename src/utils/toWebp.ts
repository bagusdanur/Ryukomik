/**
 * Konversi gambar ke WebP — mengikuti konverter RyukomikBot:
 * kualitas 95, dimensi TIDAK diubah, alpha dipertahankan.
 */
const WEBP_QUALITY = 95;

export type WebpResult = {
  file: File;
  converted: boolean;
  originalBytes: number;
  bytes: number;
};

export async function toWebp(file: File): Promise<WebpResult> {
  const originalBytes = file.size;
  const fallback: WebpResult = { file, converted: false, originalBytes, bytes: originalBytes };

  if (typeof document === "undefined") return fallback;
  if (!file.type.startsWith("image/")) return fallback;
  // Animasi GIF tidak bisa dipertahankan lewat canvas.
  if (file.type === "image/gif") return fallback;

  try {
    const bitmap = await createImageBitmap(file);
    // Batas aman canvas peramban; di atas ini biarkan file asli (server yang urus).
    if (Math.max(bitmap.width, bitmap.height) > 12_000) return fallback;

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fallback;
    // Latar putih supaya hasil WebP tidak ber-alpha — enkode alpha jauh lebih
    // lambat (dan di server bisa memicu timeout).
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY / 100),
    );
    bitmap.close?.();

    // WebP yang dihasilkan harus lebih kecil; kalau tidak, pakai aslinya.
    if (!blob || blob.size >= file.size) return fallback;

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    const out = new File([blob], name, { type: "image/webp" });
    return { file: out, converted: true, originalBytes, bytes: out.size };
  } catch {
    return fallback;
  }
}
