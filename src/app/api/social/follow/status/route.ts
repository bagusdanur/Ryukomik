import { requireUserId } from "@/lib/social/auth";
import { socialError, socialJson } from "@/lib/social/http";
import { socialQuery } from "@/lib/social/db";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const targetUserId = new URL(request.url).searchParams.get("targetUserId");
    if (!targetUserId) return socialJson({ following: false });
    const result = await socialQuery("select 1 from social_follows where follower_id=$1 and following_id=$2", [userId, targetUserId]);
    return socialJson({ following: Boolean(result.rowCount) }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) { return socialError(error); }
}
