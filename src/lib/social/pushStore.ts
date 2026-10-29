import "server-only";

import { socialQuery } from "@/lib/social/db";

export type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/** Semua perangkat yang menerima push untuk user ini. */
export async function listPushSubscriptions(userId: string): Promise<PushSubscriptionRow[]> {
  const { rows } = await socialQuery<PushSubscriptionRow>(
    "select id::text as id, endpoint, p256dh, auth from push_subscriptions where user_id = $1",
    [userId],
  );
  return rows;
}

/** Simpan/ganti subscription perangkat. Satu endpoint hanya boleh sekali. */
export async function savePushSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  await socialQuery(
    `insert into push_subscriptions (user_id, endpoint, p256dh, auth)
     values ($1, $2, $3, $4)
     on conflict (endpoint) do update
       set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    [input.userId, input.endpoint, input.p256dh, input.auth],
  );
}

export async function deletePushSubscriptionById(id: string) {
  await socialQuery("delete from push_subscriptions where id = $1", [id]);
}

export async function deletePushSubscriptionByEndpoint(endpoint: string, userId: string) {
  await socialQuery("delete from push_subscriptions where endpoint = $1 and user_id = $2", [endpoint, userId]);
}
