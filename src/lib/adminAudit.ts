import "server-only";

import { socialQuery } from "@/lib/social/db";

export type AdminAuditAction =
  | "role_change"
  | "premium_grant"
  | "premium_remove"
  | "ban"
  | "unban"
  | "code_generate"
  | "code_delete"
  | "marathon_grant"
  | "marathon_config";

/**
 * Append-only admin audit trail.
 *
 * Written to the (otherwise unused) `activity_events` table with
 * visibility='private' so it never leaks into public activity feeds — this
 * avoids a new table while still giving every privileged action a record.
 * Auditing must never break the action itself, so failures are swallowed.
 */
export async function recordAdminAction(input: {
  actorId: string;
  actorName?: string | null;
  action: AdminAuditAction;
  targetId?: string | null;
  detail?: string | null;
}): Promise<void> {
  try {
    let actorName = input.actorName?.trim() || "";
    if (!actorName) {
      const { rows } = await socialQuery<{ username: string }>(
        "select username from social_profiles where user_id = $1",
        [input.actorId],
      );
      actorName = rows[0]?.username || "admin";
    }

    // Audit disimpan di Postgres lokal (tabel activity_events).
    await socialQuery(
      `insert into activity_events (actor_id, actor_name, event_type, entity_id, entity_label, visibility)
       values ($1, $2, $3, $4, $5, 'private')`,
      [input.actorId, actorName, `admin.${input.action}`, input.targetId || null, input.detail || null],
    );
  } catch {
    // Never let an audit failure block or roll back the privileged action.
  }
}
