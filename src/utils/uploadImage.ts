"use client";

/**
 * Upload gambar ke imgbb — jalur yang sama dengan composer Komunitas.
 *
 * Dipakai komentar chapter supaya tidak perlu bucket sendiri: kuota R2 sudah
 * dipakai untuk halaman komik, sedangkan gambar komentar volumenya kecil dan
 * cukup di-host imgbb.
 */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function uploadImageToImgbb(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Ukuran gambar maksimal 8 MB.");

  const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
  if (!apiKey) throw new Error("Upload gambar belum dikonfigurasi.");

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: formData,
  });
  const result = (await response.json().catch(() => null)) as
    | { success?: boolean; data?: { url?: string } }
    | null;
  if (!result?.success || !result.data?.url) throw new Error("Upload gambar gagal. Coba lagi.");
  return result.data.url;
}
