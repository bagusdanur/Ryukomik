/**
 * Daftar host storage project.
 *
 * File lama berada di bucket akun R2 pertama (storage.ryukomik.my.id), file
 * baru ditulis ke bucket akun kedua (storage.komano.my.id). Semua pengecekan
 * "apakah URL ini milik storage kita" harus memakai daftar ini, bukan satu
 * host hardcode, supaya chapter premium tetap terkunci dan cover tetap
 * dioptimasi setelah bucket kedua dipakai.
 */

const DEFAULT_PRIMARY = "https://storage.ryukomik.my.id";
const DEFAULT_ALT = "https://storage.komano.my.id";

function normalizeBase(value: string | undefined, fallback: string): string {
  return (value || fallback).trim().replace(/\/+$/, "");
}

function hostOf(base: string): string {
  try {
    return new URL(base).hostname;
  } catch {
    return "";
  }
}

export const PRIMARY_STORAGE_BASE = normalizeBase(process.env.NEXT_PUBLIC_TRANSLATE_CDN, DEFAULT_PRIMARY);
export const ALT_STORAGE_BASE = normalizeBase(process.env.NEXT_PUBLIC_ALT_STORAGE_BASE, DEFAULT_ALT);

export const STORAGE_HOSTS: string[] = Array.from(
  new Set([hostOf(PRIMARY_STORAGE_BASE), hostOf(ALT_STORAGE_BASE)].filter(Boolean)),
);

export const PRIMARY_STORAGE_HOST = hostOf(PRIMARY_STORAGE_BASE);

export function isStorageHost(host: string): boolean {
  return STORAGE_HOSTS.includes(host);
}

/** True kalau URL menunjuk file project (cover/chapter) di salah satu bucket. */
export function isStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && isStorageHost(parsed.hostname);
  } catch {
    return false;
  }
}
