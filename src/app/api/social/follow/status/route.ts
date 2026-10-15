import { requireUserId } from "@/lib/social/auth";
import { socialError, socialJson } from "@/lib/social/http";
import { socialQuery } from "@/lib/social/db";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const url = new URL(request.url);
    const single = url.searchParams.get("targetUserId");
    const batch = url.searchParams.get("targetUserIds");

    if (batch) {
      const ids = batch.split(",").map((id) => id.trim()).filter(Boolean).slice(0, 100);
      if (!ids.length) return socialJson({ following: {}, ids: [] }, { headers: { "Cache-Control": "private, max-age=60" } });
      const result = await socialQuery<{ following_id: string }>(
        "select following_id from social_follows where follower_id=$1 and following_id = any($2::uuid[])",
        [userId, ids],
      );
      const set = new Set(result.rows.map((row) => row.following_id));
      return socialJson(
        { following: Object.fromEntries(ids.map((id) => [id, set.has(id)])), ids },
        { headers: { "Cache-Control": "private, max-age=60" } },
      );
    }

    if (!single) return socialJson({ following: false });
    const result = await socialQuery("select 1 from social_follows where follower_id=$1 and following_id=$2", [userId, single]);
    return socialJson({ following: Boolean(result.rowCount) }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) { return socialError(error); }
}
