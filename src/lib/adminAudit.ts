import "server-only";

import { supabaseAdmin } from "@/lib/supabaseServer";

export type AdminAuditAction =
  | "role_change"
  | "premium_grant"
  | "premium_remove"
  | "ban"
  | "unban"
  | "code_generate"
  | "code_delete";

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
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("username")
        .eq("id", input.actorId)
        .maybeSingle();
      actorName = (data as { username?: string | null } | null)?.username || "admin";
    }

    await supabaseAdmin.from("activity_events").insert({
      actor_id: input.actorId,
      actor_name: actorName,
      event_type: `admin.${input.action}`,
      entity_id: input.targetId || null,
      entity_label: input.detail || null,
      visibility: "private",
    });
  } catch {
    // Never let an audit failure block or roll back the privileged action.
  }
}
