import "server-only";

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Cache konfigurasi berbasis file untuk `app_settings`.
 *
 * Bacaan konfigurasi (ads, apk, title rush) hanya berubah saat admin menyimpan,
 * tapi sebelumnya dibaca ulang ke Supabase terus-menerus (~1.967 call/hari,
 * 1,26 MB/hari). Sekarang: baca file lokal dulu, isi dari Supabase sekali saat
 * cache kosong/kedaluwarsa, dan hapus file setiap kali admin menyimpan.
 *
 * TTL panjang hanya jaring pengaman — jalur tulis SELALU memanggil
 * `invalidateLocalSetting()` supaya perubahan admin langsung terpakai.
 */

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;
const NULL_TTL_MS = 10 * 60 * 1000;

type Entry<T> = { at: number; value: T };

const memory = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function fileFor(key: string): string {
  const safe = key.replace(/[^a-z0-9_-]/gi, "_");
  return resolve(process.cwd(), "data", "settings", `${safe}.json`);
}

function readFromDisk<T>(key: string): Entry<T> | null {
  try {
    const raw = readFileSync(fileFor(key), "utf8");
    const parsed = JSON.parse(raw) as Entry<T>;
    return typeof parsed?.at === "number" ? parsed : null;
  } catch {
    return null;
  }
}

function writeToDisk<T>(key: string, entry: Entry<T>) {
  try {
    const file = fileFor(key);
    mkdirSync(resolve(process.cwd(), "data", "settings"), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(entry), "utf8");
    renameSync(tmp, file);
  } catch (error) {
    console.error("[local-settings] gagal menulis cache:", error instanceof Error ? error.message : error);
  }
}

function fresh<T>(entry: Entry<T> | null, ttlMs: number): Entry<T> | null {
  if (!entry) return null;
  const ttl = entry.value == null ? NULL_TTL_MS : ttlMs;
  return Date.now() - entry.at <= ttl ? entry : null;
}

/**
 * Baca setting dari cache lokal; kalau tidak ada/kedaluwarsa, panggil `loader`
 * (biasanya satu query Supabase) lalu simpan hasilnya.
 */
export async function getLocalSetting<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const cached = fresh((memory.get(key) as Entry<T> | undefined) ?? readFromDisk<T>(key), ttlMs);
  if (cached) {
    memory.set(key, cached);
    return cached.value;
  }

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const request = loader()
    .then((value) => {
      const entry: Entry<T> = { at: Date.now(), value };
      memory.set(key, entry);
      writeToDisk(key, entry);
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}

/** Hapus cache satu setting (dipanggil setiap kali admin menyimpan). */
export function invalidateLocalSetting(key: string) {
  memory.delete(key);
  inflight.delete(key);
  try {
    rmSync(fileFor(key), { force: true });
  } catch {
    // best-effort
  }
}
