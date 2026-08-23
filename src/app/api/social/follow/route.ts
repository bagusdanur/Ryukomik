import { revalidateTag } from "next/cache";
import { socialQuery, socialTransaction } from "@/lib/social/db";
import { ensureSocialProfile } from "@/lib/social/profileSync";
import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { allowsSocialNotification } from "@/lib/social/notifications";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireUserId(request);
    if (!socialLimit(request, userId, 20)) return socialJson({ error: "Terlalu banyak permintaan." }, { status: 429 });
    const { targetUserId } = await request.json() as { targetUserId?: string };
    if (!targetUserId || targetUserId === userId) return socialJson({ error: "Target tidak valid." }, { status: 400 });

    await Promise.all([ensureSocialProfile(userId), ensureSocialProfile(targetUserId)]);
    const targetResult = await socialQuery<{ username: string }>("select username from social_profiles where user_id=$1", [targetUserId]);
    const target = targetResult.rows[0];
    if (!target) return socialJson({ error: "User tidak ditemukan." }, { status: 404 });
    const blocked = await socialQuery("select 1 from social_blocks where (blocker_id=$1 and blocked_id=$2) or (blocker_id=$2 and blocked_id=$1) limit 1", [userId, targetUserId]);
    if (blocked.rowCount) return socialJson({ error: "Interaksi tidak tersedia." }, { status: 403 });
    const notifyFollow = await allowsSocialNotification(targetUserId, "follows");
    await socialTransaction(async (client) => {
      await client.query("insert into social_follows(follower_id,following_id) values($1,$2) on conflict do nothing", [userId, targetUserId]);
      const actor = await client.query<{ username: string }>("select username from social_profiles where user_id=$1", [userId]);
      const actorName = actor.rows[0]?.username || "User";
      if (notifyFollow) await client.query("insert into social_notifications(user_id,actor_id,actor_name,type,target_id) values($1,$2,$3,'new_follower',$2::text)", [targetUserId, userId, actorName]);
      await client.query("insert into social_activity_events(actor_id,actor_name,event_type,entity_id,entity_label,visibility) values($1,$2,'followed_user',$3,$4,'followers')", [userId, actorName, targetUserId, target.username]);
    });
    revalidateTag("social-profile", { expire: 0 });
    revalidateTag("social-feed", { expire: 0 });
    return socialJson({ following: true });
  } catch (error) { return socialError(error); }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireUserId(request);
    const { targetUserId } = await request.json() as { targetUserId?: string };
    if (!targetUserId) return socialJson({ error: "Target tidak valid." }, { status: 400 });
    await socialQuery("delete from social_follows where follower_id=$1 and following_id=$2", [userId, targetUserId]);
    revalidateTag("social-profile", { expire: 0 });
    revalidateTag("social-feed", { expire: 0 });
    return socialJson({ following: false });
  } catch (error) { return socialError(error); }
}
