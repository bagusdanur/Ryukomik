import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Rate limit sederhana per proses (cukup karena aplikasi berjalan satu instance).
 * Kunci = `<aksi>:<userId>`. Return null kalau boleh lanjut.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { error: string; retryAfter: number } | null {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // Bersihkan bucket lama sesekali agar map tidak tumbuh tanpa batas.
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return null;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      error: "Terlalu banyak permintaan. Coba lagi sebentar lagi.",
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return null;
}

/** Versi siap pakai: mengembalikan NextResponse 429 atau null. */
export function rateLimitResponse(
  key: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const blocked = checkRateLimit(key, limit, windowMs);
  if (!blocked) return null;
  return NextResponse.json(
    { error: blocked.error },
    { status: 429, headers: { "Retry-After": String(blocked.retryAfter), "Cache-Control": "no-store" } },
  );
}
