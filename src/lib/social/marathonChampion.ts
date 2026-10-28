import { socialQuery } from "@/lib/social/db";
import { previousWeekKey, weekKey } from "@/lib/marathon/period";

/**
 * Juara 1 Marathon mingguan.
 *
 * Frame "Juara 1 Marathon" hanya boleh dipakai juara minggu berjalan. Pemenang
 * ditentukan dua sumber:
 *  1. `marathon_winners`  — juara minggu yang sudah difinalisasi (peringkat 1).
 *  2. `marathon_scores`   — pemimpin sementara minggu ini, supaya frame sudah
 *     berpindah begitu klasemen berganti, tanpa menunggu finalisasi.
 * Dengan begitu pemilik frame otomatis berganti tiap minggu.
 */
export async function isMarathonChampion(userId: string, now: Date = new Date()): Promise<boolean> {
  const current = weekKey(now);
  const previous = previousWeekKey(now);

  try {
    const { rows } = await socialQuery<{ ok: number }>(
      `select 1 as ok
         from marathon_winners
        where user_id = $1
          and period_type = 'weekly'
          and rank = 1
          and period_key = any($2::text[])
        limit 1`,
      [userId, [current, previous]],
    );
    if (rows.length) return true;

    const live = await socialQuery<{ user_id: string }>(
      `select user_id
         from marathon_scores
        where period_type = 'weekly'
          and period_key = $1
          and chapters > 0
        order by chapters desc, updated_at asc
        limit 1`,
      [current],
    );
    return live.rows[0]?.user_id === userId;
  } catch (error) {
    // Jangan blokir user hanya karena tabel event bermasalah.
    console.error("[marathon-champion] cek gagal:", error instanceof Error ? error.message : error);
    return false;
  }
}
