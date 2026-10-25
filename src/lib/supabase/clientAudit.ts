"use client";

/**
 * Audit egress Supabase untuk klien anon (browser).
 *
 * Instrumen server hanya melihat panggilan `supabaseAdmin`; padahal user yang
 * login memanggil PostgREST langsung dari HP dengan anon key — bagian yang
 * paling mungkin menyumbang egress besar dan tidak terlihat di server.
 *
 * Sifatnya pengukur saja: tidak mengubah respons, tidak menambah query. Aktif
 * hanya jika NEXT_PUBLIC_EGRESS_AUDIT=1; agregat dikirim tiap 60 detik ke
 * /api/_egress/client dan ditulis sebagai JSONL di server.
 */

type Bucket = { count: number; bytes: number; rows: number; errors: number };

const FLUSH_MS = 60 * 1000;

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
  if (!timer && typeof window !== "undefined") {
    timer = setInterval(flush, FLUSH_MS);
  }
}

function measure(value: unknown): { bytes: number; rows: number } {
  if (value == null) return { bytes: 0, rows: 0 };
  try {
    const bytes = new Blob([JSON.stringify(value) || ""]).size;
    const rows = Array.isArray(value) ? value.length : 1;
    return { bytes, rows };
  } catch {
    return { bytes: 0, rows: 0 };
  }
}

function flush() {
  if (!buckets.size || typeof window === "undefined") return;
  const snapshot = Object.fromEntries([...buckets.entries()].map(([key, b]) => [key, b]));
  buckets.clear();
  try {
    fetch("/api/egress-client", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ts: new Date().toISOString(), path: window.location.pathname, buckets: snapshot }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // pengukur tidak boleh mengganggu aplikasi
  }
}

/** Bungkus client supabase-js (anon): catat ukuran respons per tabel/RPC. */
export function withClientEgressAudit<T extends object>(client: T): T {
  const wrapBuilder = (builder: unknown, key: string): unknown =>
    new Proxy(builder as object, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value !== "function") return value;
        // Builder supabase-js adalah thenable; ukur tepat di `then` supaya
        // rantai `.select().eq()` tidak terputus.
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
          wrapBuilder((value as (...a: unknown[]) => unknown).apply(target, args), key);
      },
    });

  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop === "from") {
        return (table: string, ...rest: unknown[]) =>
          wrapBuilder((value as (...a: unknown[]) => unknown).call(target, table, ...rest), `from:${table}`);
      }
      if (prop === "rpc") {
        return (fn: string, ...rest: unknown[]) =>
          wrapBuilder((value as (...a: unknown[]) => unknown).call(target, fn, ...rest), `rpc:${fn}`);
      }
      if (typeof value === "function") return value.bind(target);
      return value;
    },
  }) as T;
}

export function clientEgressAuditEnabled(): boolean {
  return process.env.NEXT_PUBLIC_EGRESS_AUDIT === "1";
}
