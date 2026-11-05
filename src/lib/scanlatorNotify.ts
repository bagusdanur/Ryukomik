import { socialQuery } from "@/lib/social/db";

export type ScanlatorNotificationType =
  | "project_approved"
  | "project_rejected"
  | "project_pending"
  | "warn"
  | "suspend"
  | "revoke"
  | "restore"
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
    await socialQuery(
      "insert into scanlator_notifications (user_id, type, title, body, link) values ($1, $2, $3, $4, $5)",
      [userId, data.type, data.title.slice(0, 200), data.body ? data.body.slice(0, 800) : null, data.link || null],
    );
  } catch (error) {
    console.error("[scanlator-notify] gagal:", error instanceof Error ? error.message : error);
  }
}
