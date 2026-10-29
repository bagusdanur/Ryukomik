import { socialQuery } from "@/lib/social/db";
import { weekKey } from "@/lib/marathon/period";

export type MarathonStanding = {
  /** Peringkat di minggu berjalan (0 = tidak masuk 3 besar). */
  current: number;
  /** Peringkat terbaik sepanjang event (0 = belum pernah masuk 3 besar). */
  best: number;
};

/**
 * Peringkat Marathon untuk pemakaian frame juara.
 *
 *  - `current` : klasemen minggu berjalan (marathon_winners bila sudah
 *    difinalisasi, kalau belum pakai marathon_scores). Dipakai untuk memasang
 *    frame otomatis ke juara aktif.
 *  - `best`    : peringkat terbaik yang pernah diraih. Pemilik title lama tetap
 *    boleh memakai frame-nya walau minggunya sudah lewat.
 */
export async function getMarathonStanding(userId: string, now: Date = new Date()): Promise<MarathonStanding> {
  const currentKey = weekKey(now);
  try {
    const winner = await socialQuery<{ rank: number }>(
      `select rank from marathon_winners
        where user_id = $1 and period_type = 'weekly' and period_key = $2 and rank <= 3
        order by rank asc limit 1`,
      [userId, currentKey],
    );

    let current = Number(winner.rows[0]?.rank) || 0;

    if (!current) {
      const live = await socialQuery<{ user_id: string }>(
        `select user_id from marathon_scores
          where period_type = 'weekly' and period_key = $1 and chapters > 0
          order by chapters desc, updated_at asc
          limit 3`,
        [currentKey],
      );
      const index = live.rows.findIndex((row) => row.user_id === userId);
      current = index >= 0 ? index + 1 : 0;
    }

    const bestRow = await socialQuery<{ best: number | null }>(
      `select min(rank)::int as best from marathon_winners
        where user_id = $1 and period_type = 'weekly' and rank <= 3`,
      [userId],
    );

    return { current, best: Number(bestRow.rows[0]?.best) || 0 };
  } catch (error) {
    console.error("[marathon-standing] cek gagal:", error instanceof Error ? error.message : error);
    return { current: 0, best: 0 };
  }
}
