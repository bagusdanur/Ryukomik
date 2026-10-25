/**
 * Audit egress Supabase SEMENTARA.
 *
 * Tujuan: menghitung jumlah query + bytes respons per tabel / RPC selama
 * beberapa jam, supaya penghematan menyasar pihak yang benar-benar
 * terbesar — bukan tebakan dari baca kode (semua jalur utama ternyata
 * sudah di-cache, jadi pemborosnya tersebar).
 *
 * Sifatnya pengukur saja: tidak menambah satu pun query Supabase, tidak
 * mengubah perilaku respons. Aktif hanya jika EGRESS_AUDIT=1; hasil
 * ditulis sebagai JSONL ke data/egress-audit.jsonl tiap 5 menit.
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

type Bucket = { count: number; bytes: number; rows: number; errors: number };

const FLUSH_MS = 5 * 60 * 1000;
const buckets = new Map<string, Bucket>();
let timer: ReturnType<typeof setInterval> | null = null;

function bump(key: string, bytes: number, rows: number, isError: boolean) {
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { count: 0, bytes: 0, rows: 0, errors: 0 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  bucket.bytes += bytes;
  bucket.rows += rows;
  if (isError) bucket.errors += 1;
  if (!timer) {
    timer = setInterval(flush, FLUSH_MS);
    timer.unref?.();
  }
}

function measure(value: unknown): { bytes: number; rows: number } {
  if (value == null) return { bytes: 0, rows: 0 };
  try {
    const bytes = Buffer.byteLength(JSON.stringify(value) || "", "utf8");
    const rows = Array.isArray(value) ? value.length : 1;
    return { bytes, rows };
  } catch {
    return { bytes: 0, rows: 0 };
  }
}

function flush() {
  if (!buckets.size) return;
  const ts = new Date().toISOString();
  const snapshot = Object.fromEntries(
    [...buckets.entries()].map(([key, b]) => [key, b]),
  );
  buckets.clear();
  try {
    const dir = resolve(process.cwd(), "data");
    mkdirSync(dir, { recursive: true });
    appendFileSync(
      resolve(dir, "egress-audit.jsonl"),
      JSON.stringify({ ts, buckets: snapshot }) + "\n",
      "utf8",
    );
  } catch (error) {
    console.error("[egress-audit] gagal menulis:", error);
  }
}

/** Bungkus client supabase-js: catat ukuran respons per `from(tabel)` / `rpc(nama)`. */
export function withEgressAudit<T extends object>(client: T): T {
  const wrapBuilder = (builder: unknown, key: string): unknown =>
    new Proxy(builder as object, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value !== "function") return value.bind(target);
        // Builder supabase-js adalah thenable: rekam ukurannya tepat di `then`
        // (saat di-await). Jangan membungkus hasil method lain menjadi Promise
        // — itu memutus rantai builder (`.select().eq()` jadi rusak).
        if (prop === "then") {
          return (
            onFulfilled?: (result: unknown) => unknown,
            onRejected?: (reason: unknown) => unknown,
          ) =>
            (value as (...a: unknown[]) => unknown).call(
              target,
              (result: { data?: unknown; error?: unknown } | null) => {
                if (result && typeof result === "object" && "data" in result) {
                  const { bytes, rows } = measure(result.data);
                  bump(key, bytes, rows, Boolean(result.error));
                } else {
                  bump(key, 0, 0, false);
                }
                return onFulfilled ? onFulfilled(result) : result;
              },
              onRejected,
            );
        }
        return (...args: unknown[]) =>
          wrapBuilder(
            (value as (...a: unknown[]) => unknown).apply(target, args),
            key,
          );
      },
    });

  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop === "from") {
        return (table: string, ...rest: unknown[]) =>
          wrapBuilder(
            (value as (...a: unknown[]) => unknown).call(target, table, ...rest),
            `from:${table}`,
          );
      }
      if (prop === "rpc") {
        return (fn: string, ...rest: unknown[]) =>
          wrapBuilder(
            (value as (...a: unknown[]) => unknown).call(target, fn, ...rest),
            `rpc:${fn}`,
          );
      }
      if (typeof value === "function") return value.bind(target);
      return value;
    },
  }) as T;
}

export function egressAuditEnabled(): boolean {
  return process.env.EGRESS_AUDIT === "1";
}
