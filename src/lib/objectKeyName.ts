import "server-only";

import { HeadObjectCommand, type S3Client } from "@aws-sdk/client-s3";

/**
 * Nama objek R2 harus bisa dibaca manusia.
 *
 * Dulu semua unggahan memakai UUID / string acak (`mw6fvo2o-mkic0f.webp`), jadi
 * staf tidak bisa menebak halaman mana yang bermasalah saat ada laporan gambar
 * rusak. Sekarang nama asli file dipakai apa adanya, dan hanya diberi akhiran
 * revisi (`-v2`, `-v3`, …) kalau nama itu sudah terpakai — tetap terbaca, tapi
 * browser/CDN tidak menyajikan gambar lama setelah halaman dikoreksi.
 */

export function readableBase(name: string, fallback = "image"): string {
  const leaf = (name || "").split(/[\\/]/).pop() || "";
  const dot = leaf.lastIndexOf(".");
  const raw = dot > 0 ? leaf.slice(0, dot) : leaf;
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
    .slice(0, 80)
    .replace(/[-._]+$/g, "");
  return cleaned || fallback;
}

export function readableExt(name: string, fallback = "webp"): string {
  const leaf = (name || "").split(/[\\/]/).pop() || "";
  const dot = leaf.lastIndexOf(".");
  const raw = dot > 0 ? leaf.slice(dot + 1) : "";
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  return cleaned || fallback;
}

async function objectExists(client: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Bangun key `prefix/<nama-asli>.<ext>`, tambah `-v2`, `-v3`, … bila sudah ada.
 * `maxAttempts` dibatasi supaya unggahan tidak menggantung saat bucket lambat.
 */
export async function readableObjectKey(options: {
  client: S3Client;
  bucket: string;
  prefix: string;
  name: string;
  ext?: string;
  fallbackBase?: string;
  maxAttempts?: number;
}): Promise<string> {
  const { client, bucket, prefix, name } = options;
  const base = readableBase(name, options.fallbackBase || "image");
  const ext = options.ext || readableExt(name);
  const dir = prefix.replace(/\/+$/, "");

  // SELALU unik per unggahan. Dulu key hanya ditambah -v2 bila "sudah ada";
  // tapi setelah chapter dihapus, key lama dianggap kosong dan dipakai ulang,
  // sementara CDN/browser masih menyimpan gambar lama (Cache-Control immutable
  // 1 tahun) → pratinjau menampilkan chapter sebelumnya. Nonce pendek menjaga
  // nama tetap terbaca (001-<nonce>.webp) sekaligus mustahil bertabrakan.
  const nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  let key = `${dir}/${base}-${nonce}.${ext}`;

  // Jaring pengaman ekstra bila nonce kebetulan sama (praktis tidak mungkin).
  const attempts = Math.max(1, options.maxAttempts ?? 4);
  for (let i = 0; i < attempts && (await objectExists(client, bucket, key)); i += 1) {
    key = `${dir}/${base}-${nonce}${i + 2}.${ext}`;
  }
  return key;
}
