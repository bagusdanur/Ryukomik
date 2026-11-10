/**
 * Tipe gambar yang boleh disimpan apa adanya di R2.
 *
 * `image/svg+xml` sengaja TIDAK termasuk: objek R2 disajikan dengan
 * content-type aslinya, jadi SVG berisi <script> bisa dieksekusi browser saat
 * URL-nya dibuka langsung. Format lain yang tidak terdaftar juga ditolak.
 */
export const SAFE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

export function isSafeImageType(value: string | null | undefined): boolean {
  if (!value) return false;
  const type = value.toLowerCase().split(";")[0].trim();
  return SAFE_IMAGE_TYPES.has(type);
}
