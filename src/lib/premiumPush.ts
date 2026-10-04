import "server-only";
import webPush from "web-push";
import { supabaseAdmin } from "@/lib/supabaseServer";

type PushRow = { id: string; endpoint: string; p256dh: string; auth: string };

export async function sendPremiumActivatedPush(userId: string, requestId: string) {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return { sent: 0, skipped: true };
  webPush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contact@ryukomik.web.id", publicKey, privateKey);
  const { data, error } = await supabaseAdmin.from("push_subscriptions")
    .select("id, endpoint, p256dh, auth").eq("user_id", userId);
  if (error) throw error;
  const payload = JSON.stringify({
    type: "premium_activated", requestId,
    title: "Premium akunmu sudah aktif",
    body: "Persetujuan selesai. Semua fitur Premium kini dapat digunakan.",
    url: "/premium-pay", tag: `premium-${requestId}`,
  });
  let sent = 0;
  await Promise.all(((data || []) as PushRow[]).map(async (row) => {
    try {
      await webPush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload);
      sent += 1;
    } catch (cause) {
      const statusCode = (cause as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", row.id);
      } else console.warn("Premium push failed:", statusCode || "unknown");
    }
  }));
  return { sent, skipped: false };
}
