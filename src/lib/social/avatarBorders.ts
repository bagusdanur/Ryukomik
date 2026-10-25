import "server-only";

import { socialQuery } from "@/lib/social/db";

/**
 * Border avatar disimpan di database lokal (social_profiles). Komentar di
 * Supabase tidak menyimpan kolom ini, jadi untuk satu halaman komentar kita
 * ambil sekaligus lewat SATU query lokal — bukan satu query per komentar dan
 * tanpa menambah egress Supabase.
 */
export async function getUserAvatarBorders(userIds: Array<string | null | undefined>): Promise<Map<string, string>> {
  const ids = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));
  if (!ids.length) return new Map();

  try {
    const { rows } = await socialQuery<{ user_id: string; avatar_border: string | null }>(
      `select user_id, avatar_border
         from social_profiles
        where user_id = any($1::uuid[])
          and avatar_border is not null`,
      [ids],
    );
    return new Map(rows.map((row) => [row.user_id, row.avatar_border as string]));
  } catch (error) {
    // Border bersifat kosmetik — jangan sampai merusak halaman komentar.
    console.error("[avatar-border] lookup failed:", error instanceof Error ? error.message : error);
    return new Map();
  }
}
