import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { socialError, socialJson } from "@/lib/social/http";
import { ensureSocialProfile } from "@/lib/social/profileSync";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request); await ensureSocialProfile(userId);
    const cursor = new URL(request.url).searchParams.get("cursor");
    const result = await socialQuery(`select e.id,e.actor_id,e.actor_name,e.event_type,e.entity_id,e.entity_label,e.visibility,e.created_at
      from social_activity_events e where (e.actor_id=$1 or exists(select 1 from social_follows f where f.follower_id=$1 and f.following_id=e.actor_id))
      and e.visibility<>'private' and ($2::timestamptz is null or e.created_at<$2) order by e.created_at desc,e.id desc limit 21`, [userId, cursor]);
    const items=result.rows.slice(0,20);
    return socialJson({items,nextCursor:result.rows.length>20?items.at(-1)?.created_at:null},{headers:{"Cache-Control":"private, max-age=60"}});
  } catch(error){return socialError(error);}
}
