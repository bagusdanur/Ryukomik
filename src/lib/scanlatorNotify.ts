import { socialQuery } from "@/lib/social/db";

export type ScanlatorNotificationType =
  | "project_approved"
  | "project_rejected"
  | "project_pending"
  | "warn"
  | "suspend"
  | "revoke"
  | "restore"
  | "verify"
  | "unverify"
  | "info";

/**
 * Simpan notifikasi in-app untuk Scanlator.
 * Best-effort: kegagalan tidak boleh menggagalkan aksi admin.
 */
export async function notifyScanlator(
  userId: string,
  data: { type: ScanlatorNotificationType; title: string; body?: string | null; link?: string | null },
): Promise<void> {
  try {
    const title = data.title.slice(0, 200);
    const body = data.body ? data.body.slice(0, 800) : null;
    const link = data.link || "/scanlator";
    await Promise.all([
      socialQuery(
        "insert into scanlator_notifications (user_id, type, title, body, link) values ($1, $2, $3, $4, $5)",
        [userId, data.type, title, body, link],
      ),
      // Semua aktivitas Scanlator juga masuk lonceng global. Studio bukan pintu
      // notifikasi karena pemohon belum tentu bisa membukanya sebelum di-ACC.
      socialQuery(
        `insert into social_notifications
           (user_id, actor_name, type, slug, target_id, chapter, is_read)
         values ($1, 'Ryukomik', 'scanlator_update', $2, $3, $4, false)`,
        [userId, link, title, body],
      ),
    ]);
  } catch (error) {
    console.error("[scanlator-notify] gagal:", error instanceof Error ? error.message : error);
  }
}
