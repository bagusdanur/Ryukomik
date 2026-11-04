"use client";

/**
 * Upload gambar ke imgbb — jalur yang sama dengan composer Komunitas.
 *
 * Dipakai komentar chapter supaya tidak perlu bucket sendiri: kuota R2 sudah
 * dipakai untuk halaman komik, sedangkan gambar komentar volumenya kecil dan
 * cukup di-host imgbb.
 */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function uploadImageToImgbb(
  file: File,
  options: { token?: string; maxBytes?: number } = {},
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar.");

  const maxBytes = options.maxBytes ?? MAX_UPLOAD_BYTES;
  if (file.size > maxBytes) {
    throw new Error(`Ukuran gambar maksimal ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }

  const token = options.token || "";
  if (!token) throw new Error("Login diperlukan.");

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/images/upload", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: formData,
  });

  const responseText = await response.text().catch(() => "");
  let result: { success?: boolean; url?: string; error?: string } | null = null;
  try {
    result = JSON.parse(responseText) as typeof result;
  } catch {
    throw new Error(
      response.ok
        ? "Server upload memberikan respons tidak valid."
        : `Server upload gagal (${response.status}). Coba lagi.`,
    );
  }

  if (!response.ok || !result?.success || !result.url) {
    throw new Error(
      typeof result?.error === "string" && result.error
        ? result.error
        : "Upload gambar gagal. Coba lagi.",
    );
  }
  return result.url;
}
