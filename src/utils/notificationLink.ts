import type { NotificationItem } from "@/types/content";

const SOURCES = [
  "project",
  "kiryuu",
  "komikid",
  "komiku",
  "ikiru",
  "luvyaa",
  "sekte",
  "doujindesu",
  "meionovels",
] as const;

type LinkNotification = Pick<NotificationItem, "type" | "slug" | "target_id" | "actor_name">;

export function getNotificationLink(notification: LinkNotification) {
  if (notification.type === "title_rush_weekly") return "/game";
  if (notification.type === "premium_activated" || notification.type === "premium_reward") return "/premium-pay";
  if (notification.type === "new_follower") {
    const profile = notification.actor_name || notification.target_id;
    return profile ? `/u/${encodeURIComponent(profile)}` : "/connections";
  }
  if ((notification.type === "social_reply" || notification.type === "social_like") && notification.target_id) {
    return `/post/${encodeURIComponent(notification.target_id)}`;
  }

  let rawSlug = String(notification.slug || "").trim();
  if (!rawSlug) return "/notifications";
  if (rawSlug.startsWith("/")) return rawSlug;

  let source = "ikiru";
  for (const candidate of SOURCES) {
    const prefix = `${candidate}-`;
    if (rawSlug.startsWith(prefix)) {
      source = candidate;
      rawSlug = rawSlug.slice(prefix.length);
      break;
    }
  }

  // Legacy project comments used `ikiru-project-<slug>`, while current
  // project comments use `project-project-<slug>`.
  if (rawSlug.startsWith("project-")) {
    source = "project";
    rawSlug = rawSlug.slice("project-".length);
  }

  const isChapter = rawSlug.includes("/chapter-") || rawSlug.includes("-chapter-") || rawSlug.includes("volume");
  if (source === "meionovels") return isChapter ? `/novel/chapter/${rawSlug}` : `/novel/${rawSlug}`;
  return isChapter ? `/chapter/${source}/${rawSlug}` : `/komik/${source}/${rawSlug}`;
}
