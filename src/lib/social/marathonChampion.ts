import { socialQuery } from "@/lib/social/db";
import { weekKey } from "@/lib/marathon/period";

/**
 * Peringkat Marathon mingguan (1..3) untuk pemakaian frame juara.
 *
 * Sumber:
 *  1. `marathon_winners` — bila minggu berjalan sudah difinalisasi.
 *  2. `marathon_scores`  — klasemen sementara minggu ini, supaya frame ikut
 *     berpindah begitu posisi berubah, tanpa menunggu finalisasi.
 *
 * Hanya minggu berjalan: frame tidak menumpuk di juara minggu lalu.
 */
export async function getMarathonRank(userId: string, now: Date = new Date()): Promise<number> {
  const current = weekKey(now);
  try {
    const winner = await socialQuery<{ rank: number }>(
      `select rank from marathon_winners
        where user_id = $1 and period_type = 'weekly' and period_key = $2 and rank <= 3
        order by rank asc limit 1`,
      [userId, current],
    );
    if (winner.rows[0]?.rank) return Number(winner.rows[0].rank);

    const live = await socialQuery<{ user_id: string }>(
      `select user_id from marathon_scores
        where period_type = 'weekly' and period_key = $1 and chapters > 0
        order by chapters desc, updated_at asc
        limit 3`,
      [current],
    );
    const index = live.rows.findIndex((row) => row.user_id === userId);
    return index >= 0 ? index + 1 : 0;
  } catch (error) {
    console.error("[marathon-rank] cek gagal:", error instanceof Error ? error.message : error);
    return 0;
  }
}
