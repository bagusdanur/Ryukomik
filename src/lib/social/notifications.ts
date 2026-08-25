import "server-only";

import { socialQuery } from "@/lib/social/db";
import { ensureSocialProfile } from "@/lib/social/profileSync";

export type SocialNotificationKind = "follows" | "likes" | "replies" | "mentions" | "collections";
export type SocialNotificationType =
  | "new_follower"
  | "social_like"
  | "social_reply"
  | "social_mention"
  | "social_collection"
  | "reply"
  | "premium_activated"
  | "premium_reward";

type CreateSocialNotificationInput = {
  userId: string;
  actorId?: string | null;
  actorName?: string | null;
  type: SocialNotificationType;
  slug?: string | null;
  chapter?: string | null;
  targetId?: string | null;
};

export async function createSocialNotification(input: CreateSocialNotificationInput) {
  await ensureSocialProfile(input.userId);
  if (input.actorId && input.actorId !== input.userId) {
    await ensureSocialProfile(input.actorId);
  }

  return socialQuery(
    `insert into social_notifications
      (user_id,actor_id,actor_name,type,slug,chapter,target_id)
     values ($1,$2,$3,$4,$5,$6,$7)
     returning id`,
    [
      input.userId,
      input.actorId || null,
      input.actorName?.trim().slice(0, 120) || "Sistem",
      input.type,
      input.slug || null,
      input.chapter || null,
      input.targetId || null,
    ],
  );
}

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
