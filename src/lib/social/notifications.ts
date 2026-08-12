import "server-only";

import { supabaseAdmin } from "@/lib/supabaseServer";

export type SocialNotificationKind = "follows" | "likes" | "replies" | "mentions" | "collections";
export async function allowsSocialNotification(userId: string, kind: SocialNotificationKind) {
  const { data, error } = await supabaseAdmin.from("social_notification_preferences").select(kind).eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("[social-notification-preference]", error);
    return true;
  }
  if (!data) return true;
  return data[kind] !== false;
}
