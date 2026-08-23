import "server-only";

import { socialQuery } from "@/lib/social/db";

export type SocialNotificationKind = "follows" | "likes" | "replies" | "mentions" | "collections";
export async function allowsSocialNotification(userId: string, kind: SocialNotificationKind) {
  try {
    const result = await socialQuery<Record<SocialNotificationKind, boolean>>(
      `select ${kind} from social_notification_preferences where user_id = $1`, [userId],
    );
    return result.rows[0]?.[kind] !== false;
  } catch (error) {
    console.error("[social-notification-preference]", error);
    return true;
  }
}
