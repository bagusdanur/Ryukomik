import crypto from "node:crypto";

import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";

/**
 * Sumber RAW dipakai dari backend internal (api.ryukomik.com/<sumber>/...),
 * kumpulan modul yang sama dengan yang dipakai RyukomikBot. Tidak ada
 * kredensial tambahan: endpoint itu publik di dalam infrastruktur kita.
 */
export const RAW_SOURCES = [
  "asura",
  "demon",
  "vortex",
  "qimanga",
  "thunder",
  "mist",
  "omega",
  "kagane",
  "lua",
  "dusk",
  "evascan",
  "lagoon",
  "doujiva",
  "mgeko",
  "mgread",
  "mangadex",
] as const;

export type RawSource = (typeof RAW_SOURCES)[number];

const RAW_API_BASE = (process.env.RAW_API_BASE || "https://api.ryukomik.com").replace(/\/+$/, "");

export class RawError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function isRawSource(value: string): value is RawSource {
  return (RAW_SOURCES as readonly string[]).includes(value);
}

export type RawAccess = {
  userId: string;
  handle: string;
  dailyLimit: number;
};

/**
 * Gerbang izin. Dipanggil di setiap route RAW — jangan pernah mengandalkan
 * UI untuk menyembunyikan fitur ini.
 */
export async function rawAccessByUserId(userId: string): Promise<RawAccess> {
  const result = await socialQuery<{
    handle: string;
    status: string;
    raw_access: boolean;
    raw_daily_limit: number;
  }>(
    "select handle, status, raw_access, raw_daily_limit from scanlator_profiles where user_id = $1 limit 1",
    [userId],
  );

  const me = result.rows[0];
  if (!me) throw new RawError(403, "Kamu belum Scanlator aktif.");
  if (me.status !== "active") throw new RawError(403, "Akun scanlator kamu tidak aktif.");
  if (!me.raw_access) throw new RawError(403, "Fitur RAW belum diaktifkan admin untuk akun ini.");

  return { userId, handle: me.handle, dailyLimit: Number(me.raw_daily_limit) || 5 };
}

export async function requireRawAccess(request: Request): Promise<RawAccess> {
  return rawAccessByUserId(await requireUserId(request));
}

export async function rawApi(path: string, timeoutMs = 20_000): Promise<unknown> {
  const url = `${RAW_API_BASE}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "RyukomikScanlatorStudio/1.0" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new RawError(502, `Sumber menjawab ${response.status}.`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof RawError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new RawError(504, "Sumber tidak menjawab tepat waktu.");
    }
    throw new RawError(502, "Gagal menghubungi sumber RAW.");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * URL unduhan bertanda tangan.
 *
 * Browser mengunduh langsung dari URL ini (bukan lewat fetch + blob), supaya
 * file 100+ MB tidak ditahan di memori HP. Token berlaku 10 menit dan terikat
 * ke user + sumber + seri + chapter, jadi tidak bisa dipakai ulang oleh orang lain.
 */
function rawSecret(): string {
  return (
    process.env.RAW_DOWNLOAD_SECRET ||
    process.env.PROJECT_API_INTERNAL_TOKEN ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "ryukomik-raw-fallback"
  );
}

export function signRawDownload(
  userId: string,
  source: string,
  series: string,
  chapter: string,
  jobId = "",
): string {
  const exp = Date.now() + 10 * 60 * 1000;
  const payload = `${userId}|${source}|${series}|${chapter}|${exp}|${jobId}`;
  const mac = crypto.createHmac("sha256", rawSecret()).update(payload).digest("base64url");
  return Buffer.from(payload).toString("base64url") + "." + mac;
}

export function verifyRawDownload(
  token: string,
): { userId: string; source: string; series: string; chapter: string; jobId: string } | null {
  const [encoded, mac] = token.split(".");
  if (!encoded || !mac) return null;
  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = crypto.createHmac("sha256", rawSecret()).update(payload).digest("base64url");
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  const [userId, source, series, chapter, exp, jobId] = payload.split("|");
  if (!userId || !source || !series || !chapter || Number(exp) < Date.now()) return null;
  return { userId, source, series, chapter, jobId: jobId || "" };
}

/** Hitung unduhan hari ini (zona Asia/Jakarta) untuk batas harian. */
export async function countTodayDownloads(userId: string): Promise<number> {
  const result = await socialQuery<{ n: number }>(
    "select count(*)::int as n from scanlator_raw_downloads where user_id = $1 and created_at >= date_trunc('day', now() at time zone 'Asia/Jakarta')",
    [userId],
  );
  return Number(result.rows[0]?.n) || 0;
}

export async function recordDownload(input: {
  userId: string;
  handle: string;
  source: string;
  seriesSlug: string;
  seriesTitle: string;
  chapterSlug: string;
  chapterTitle: string;
  images: number;
  bytes: number;
}): Promise<void> {
  await socialQuery(
    `insert into scanlator_raw_downloads
       (user_id, handle, source, series_slug, series_title, chapter_slug, chapter_title, images, bytes)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      input.userId,
      input.handle,
      input.source,
      input.seriesSlug,
      input.seriesTitle,
      input.chapterSlug,
      input.chapterTitle,
      input.images,
      input.bytes,
    ],
  );
}
