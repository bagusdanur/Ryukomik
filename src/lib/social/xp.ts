import "server-only";

import { socialTransaction } from "@/lib/social/db";

/**
 * XP & riwayat baca — database LOKAL (irisan 3).
 *
 * Rumus level diverifikasi dari data produksi Supabase:
 *   level = floor(xp / 100) + 1   (55.200→553, 52.535→526, 34.435→345, 0→1)
 *
 * Idempotensi baca memakai primary key (user_id, chapter_slug) di tabel
 * user_reads: chapter yang sama tidak pernah menambah XP dua kali.
 */
const LEVEL_STEP = 100;
const READ_XP = 5;

export type XpResult = { xp: number | null; level: number | null; delta: number };

export async function addXp(userId: string, amount: number): Promise<XpResult> {
  const delta = Math.max(0, Math.floor(Number(amount) || 0));
  if (!delta) return { xp: null, level: null, delta: 0 };

  return socialTransaction(async (client) => {
    const { rows } = await client.query<{ xp: number; level: number }>(
      `update social_profiles
          set xp = xp + $2,
              level = floor((xp + $2)::numeric / ${LEVEL_STEP})::int + 1,
              updated_at = now()
        where user_id = $1
        returning xp, level`,
      [userId, delta],
    );
    const row = rows[0];
    if (!row) return { xp: null, level: null, delta: 0 };

    await client.query(
      "insert into profile_write_log (user_id, fields, actor) values ($1,$2,$3)",
      [userId, JSON.stringify({ xp: delta, level: row.level }), "xp/add"],
    );
    return { xp: Number(row.xp), level: Number(row.level), delta };
  });
}

export async function recordReads(
  userId: string,
  chapterSlugs: string[],
  xpPerChapter = READ_XP,
): Promise<{ recorded: number; xpAdded: number }> {
  const slugs = Array.from(
    new Set(
      chapterSlugs
        .filter((slug): slug is string => typeof slug === "string")
        .map((slug) => slug.trim())
        .filter(Boolean),
    ),
  ).slice(0, 20);
  if (!slugs.length) return { recorded: 0, xpAdded: 0 };

  return socialTransaction(async (client) => {
    const inserted = await client.query<{ chapter_slug: string }>(
      `insert into user_reads (user_id, chapter_slug)
       select $1, unnest($2::text[])
       on conflict (user_id, chapter_slug) do nothing
       returning chapter_slug`,
      [userId, slugs],
    );
    const recorded = inserted.rowCount || 0;
    if (!recorded) return { recorded: 0, xpAdded: 0 };

    const xpAdded = recorded * Math.max(0, Math.floor(Number(xpPerChapter) || 0));
    await client.query(
      `update social_profiles
          set xp = xp + $2,
              level = floor((xp + $2)::numeric / ${LEVEL_STEP})::int + 1,
              total_reads = coalesce(total_reads, 0) + $3,
              updated_at = now()
        where user_id = $1`,
      [userId, xpAdded, recorded],
    );
    await client.query(
      "insert into profile_write_log (user_id, fields, actor) values ($1,$2,$3)",
      [userId, JSON.stringify({ xp: xpAdded, total_reads: recorded }), "xp/read"],
    );

    return { recorded, xpAdded };
  });
}
