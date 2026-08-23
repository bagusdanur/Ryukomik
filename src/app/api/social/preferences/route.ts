import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson } from "@/lib/social/http";
import { socialQuery } from "@/lib/social/db";
import { ensureSocialProfile } from "@/lib/social/profileSync";

const DEFAULTS = { follows: true, likes: true, replies: true, mentions: true, collections: true };

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    await ensureSocialProfile(userId);
    const result = await socialQuery("select follows,likes,replies,mentions,collections from social_notification_preferences where user_id=$1", [userId]);
    return socialJson({ preferences: result.rows[0] || DEFAULTS }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return socialError(error); }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireUserId(request);
    const input = await request.json() as Partial<typeof DEFAULTS>;
    const preferences = Object.fromEntries(Object.keys(DEFAULTS).map((key) => [key, input[key as keyof typeof DEFAULTS] !== false]));
    await ensureSocialProfile(userId);
    await socialQuery(`insert into social_notification_preferences(user_id,follows,likes,replies,mentions,collections,updated_at)
      values($1,$2,$3,$4,$5,$6,now()) on conflict(user_id) do update set follows=excluded.follows,likes=excluded.likes,
      replies=excluded.replies,mentions=excluded.mentions,collections=excluded.collections,updated_at=now()`,
      [userId, preferences.follows, preferences.likes, preferences.replies, preferences.mentions, preferences.collections]);
    return socialJson({ preferences });
  } catch (error) { return socialError(error); }
}
