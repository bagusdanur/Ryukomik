import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

/**
 * Dua akun R2:
 *  - akun utama  : bucket lama (file yang sudah ada, host storage.ryukomik.my.id)
 *  - akun kedua  : bucket "project" (upload baru, host storage.komano.my.id)
 *
 * Upload baru diarahkan ke akun kedua kalau kredensialnya lengkap; kalau tidak,
 * semuanya jatuh kembali ke akun utama supaya tidak ada jalur upload yang mati.
 */

export type R2Target = {
  id: "primary" | "alt";
  client: S3Client;
  bucket: string;
  publicBase: string;
};

function makeClient(accountId: string, accessKeyId: string, secretAccessKey: string): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // R2 tidak mendukung checksum CRC32 otomatis; tanpa ini presigned PUT gagal.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

const primary: R2Target = {
  id: "primary",
  client: makeClient(
    process.env.R2_ACCOUNT_ID || "",
    process.env.R2_ACCESS_KEY_ID || "",
    process.env.R2_SECRET_ACCESS_KEY || "",
  ),
  bucket: process.env.R2_BUCKET_NAME || "ryukomik-translate",
  publicBase: (process.env.NEXT_PUBLIC_TRANSLATE_CDN || "https://storage.ryukomik.my.id").replace(/\/+$/, ""),
};

const altConfigured =
  !!process.env.R2_ALT_ACCOUNT_ID &&
  !!process.env.R2_ALT_ACCESS_KEY_ID &&
  !!process.env.R2_ALT_SECRET_ACCESS_KEY &&
  !!process.env.R2_ALT_BUCKET_NAME;

const alt: R2Target | null = altConfigured
  ? {
      id: "alt",
      client: makeClient(
        process.env.R2_ALT_ACCOUNT_ID as string,
        process.env.R2_ALT_ACCESS_KEY_ID as string,
        process.env.R2_ALT_SECRET_ACCESS_KEY as string,
      ),
      bucket: process.env.R2_ALT_BUCKET_NAME as string,
      publicBase: (process.env.R2_ALT_PUBLIC_BASE || "https://storage.komano.my.id").replace(/\/+$/, ""),
    }
  : null;

export function uploadTarget(): R2Target {
  return alt ?? primary;
}

/**
 * Pilih bucket tujuan dari nilai yang dikirim admin ("primary" | "alt").
 * Nilai tak dikenal jatuh ke target default (akun kedua bila tersedia).
 */
export function targetById(id: string | null | undefined): R2Target {
  if (id === "primary") return primary;
  if (id === "alt") return alt ?? primary;
  return uploadTarget();
}

export function allTargets(): R2Target[] {
  return alt ? [primary, alt] : [primary];
}

export function primaryTarget(): R2Target {
  return primary;
}

export function altTarget(): R2Target | null {
  return alt;
}
