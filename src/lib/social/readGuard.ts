import { socialQuery } from "@/lib/social/db";

/**
 * Penjaga /api/xp/read: client mengirim chapter_slugs sendiri, jadi tanpa
 * validasi siapa pun bisa "membaca" chapter karangan lalu menyentuh cap maraton.
 *
 * Lapis:
 *  1. format     — tolak slug yang tidak berbentuk chapter.
 *  2. laju       — batas 45 chapter / 10 menit dan 120 / jam per user.
 *  3. asal-usul  — slug harus pernah dibuka lewat halaman reader
 *                  (tercatat di `chapter_seen`). Halaman reader hanya bisa
 *                  Dirender kalau chapternya benar-benar ada di sumber.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_CHARSET = /^[a-z0-9][a-z0-9._~/-]*$/i;
const HAS_CHAPTER = /chapter-[0-9]/i;

export const RATE_LIMITS = {
  perTenMinutes: 45,
  perHour: 120,
};

export function isValidChapterSlug(slug: string) {
  if (!slug || slug.length > 180) return false;
  if (!SLUG_CHARSET.test(slug)) return false;
  return UUID.test(slug) || HAS_CHAPTER.test(slug);
}

export function filterValidSlugs(slugs: string[]) {
  return slugs.filter(isValidChapterSlug);
}

export async function checkReadRate(userId: string): Promise<{ ok: boolean; retryAfter?: number; reason?: string }> {
  const { rows } = await socialQuery<{ last10: number; lastHour: number }>(
    `select
       count(*) filter (where created_at >= now() - interval '10 minutes')::int as "last10",
       count(*) filter (where created_at >= now() - interval '1 hour')::int as "lastHour"
     from user_reads where user_id = $1`,
    [userId],
  );
  const last10 = rows[0]?.last10 ?? 0;
  const lastHour = rows[0]?.lastHour ?? 0;
  if (last10 >= RATE_LIMITS.perTenMinutes) {
    return { ok: false, retryAfter: 600, reason: "rate_10m" };
  }
  if (lastHour >= RATE_LIMITS.perHour) {
    return { ok: false, retryAfter: 3600, reason: "rate_1h" };
  }
  return { ok: true };
}

/** Catat bahwa chapter benar-benar pernah dirender halaman reader. */
export async function markChapterSeen(slug: string, source?: string) {
  try {
    await socialQuery(
      `insert into chapter_seen (slug, source) values ($1, $2)
       on conflict (slug) do update set seen_at = now(),
         source = coalesce(excluded.source, chapter_seen.source)`,
      [slug, source ?? null],
    );
  } catch (error) {
    console.error("[chapter-seen] gagal mencatat:", error instanceof Error ? error.message : error);
  }
}

/** Saring slug yang pernah dibuka dalam 7 hari terakhir. */
export async function filterSeenSlugs(slugs: string[]): Promise<string[]> {
  if (!slugs.length) return [];
  const { rows } = await socialQuery<{ slug: string }>(
    `select slug from chapter_seen
      where slug = any($1::text[]) and seen_at > now() - interval '7 days'`,
    [slugs],
  );
  const seen = new Set(rows.map((row) => row.slug));
  return slugs.filter((slug) => seen.has(slug));
}
