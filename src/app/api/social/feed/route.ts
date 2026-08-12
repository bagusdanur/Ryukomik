import { supabaseAdmin } from "@/lib/supabaseServer";
import { requireUserId } from "@/lib/social/auth";
import { socialError, socialJson } from "@/lib/social/http";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const { data: follows, error: followsError } = await supabaseAdmin.from("user_follows").select("following_id").eq("follower_id", userId).limit(500);
    if (followsError) throw followsError;
    const actorIds = [userId, ...(follows || []).map((row) => row.following_id)];
    let query = supabaseAdmin.from("activity_events")
      .select("id, actor_id, actor_name, event_type, entity_id, entity_label, visibility, created_at")
      .in("actor_id", actorIds).neq("visibility", "private")
      .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(21);
    if (cursor) query = query.lt("created_at", cursor);
    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    const hasMore = rows.length > 20;
    const items = rows.slice(0, 20);
    return socialJson({ items, nextCursor: hasMore ? items.at(-1)?.created_at : null }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) { return socialError(error); }
}
