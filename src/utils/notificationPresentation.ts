import type { NotificationItem } from "@/types/content";

export function getNotificationLabel(item: Pick<NotificationItem, "type" | "actor_name" | "notification_title" | "notification_message">) {
  const actor = item.actor_name || "Seseorang";
  switch (item.type) {
    case "announcement":
      return [item.notification_title, item.notification_message].filter(Boolean).join(" — ") || "Pengumuman baru dari Ryukomik";
    case "new_follower":
      return `${actor} mulai mengikuti kamu`;
    case "social_like":
      return `${actor} menyukai postinganmu`;
    case "social_reply":
      return `${actor} membalas postinganmu`;
    case "social_mention":
      return `${actor} menyebut kamu dalam postingan`;
    case "social_collection":
      return `${actor} membagikan koleksi kepadamu`;
    case "premium_activated":
      return "Premium akunmu sudah aktif";
    case "premium_reward":
      return `${actor} mengirim hadiah premium`;
    default:
      return `${actor} membalas komentar kamu`;
  }
}
