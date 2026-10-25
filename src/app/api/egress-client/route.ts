import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { NextResponse } from "next/server";

/**
 * Penerima agregat audit egress dari browser (lihat src/lib/supabase/clientAudit.ts).
 *
 * Hanya aktif saat EGRESS_AUDIT=1. Menulis JSONL ke data/egress-client.jsonl.
 * Endpoint ini sengaja dibuat tahan banting: ukuran body dibatasi, rate-limit
 * per IP, dan bentuk payload divalidasi — kalau bukan angka, dibuang.
 */

const MAX_BODY = 8 * 1024;
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 40;

const hits = new Map<string, { count: number; resetAt: number }>();

function allowed(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_PER_WINDOW;
}

function sanitize(buckets: unknown) {
  if (!buckets || typeof buckets !== "object") return {};
  const out: Record<string, { count: number; bytes: number; rows: number; errors: number }> = {};
  for (const [key, value] of Object.entries(buckets as Record<string, unknown>).slice(0, 60)) {
    if (!value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    const num = (input: unknown) => {
      const n = Number(input);
      return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
    };
    out[String(key).slice(0, 80)] = {
      count: num(row.count),
      bytes: num(row.bytes),
      rows: num(row.rows),
      errors: num(row.errors),
    };
  }
  return out;
}

export async function POST(request: Request) {
  if (process.env.EGRESS_AUDIT !== "1") {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }

  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (!allowed(ip)) return NextResponse.json({ ok: false }, { status: 429 });

  const body = await request.text();
  if (body.length > MAX_BODY) return NextResponse.json({ error: "too large" }, { status: 413 });

  let payload: { ts?: unknown; path?: unknown; buckets?: unknown };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const buckets = sanitize(payload.buckets);
  if (!Object.keys(buckets).length) return NextResponse.json({ ok: true });

  try {
    const dir = resolve(process.cwd(), "data");
    mkdirSync(dir, { recursive: true });
    appendFileSync(
      resolve(dir, "egress-client.jsonl"),
      JSON.stringify({
        ts: typeof payload.ts === "string" ? payload.ts : new Date().toISOString(),
        path: typeof payload.path === "string" ? payload.path.slice(0, 120) : null,
        buckets,
      }) + "\n",
      "utf8",
    );
  } catch (error) {
    console.error("[egress-client] gagal menulis:", error instanceof Error ? error.message : error);
  }

  return NextResponse.json({ ok: true });
}
