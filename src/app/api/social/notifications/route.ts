import { supabaseAdmin } from "@/lib/supabaseServer";
import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";

const COLUMNS = "id, user_id, actor_id, actor_name, type, slug, target_id, is_read, created_at";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    if (!socialLimit(request, userId, 65)) return socialJson({ error: "Terlalu banyak permintaan." }, { status: 429 });
    const url = new URL(request.url);
    const countOnly = url.searchParams.get("count") === "1";
    if (countOnly) {
      const { count, error } = await supabaseAdmin.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false);
      if (error) throw error;
      return socialJson({ unreadCount: count || 0 }, { headers: { "Cache-Control": "private, max-age=30" } });
    }
    const cursor = url.searchParams.get("cursor");
    let query = supabaseAdmin.from("notifications").select(COLUMNS).eq("user_id", userId).order("created_at", { ascending: false }).limit(21);
    if (cursor) query = query.lt("created_at", cursor);
    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    const items = rows.slice(0, 20);
    return socialJson({ items, unreadCount: items.filter((item) => !item.is_read).length, nextCursor: rows.length > 20 ? items.at(-1)?.created_at : null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return socialError(error); }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireUserId(request);
    const body = await request.json() as { ids?: string[]; all?: boolean };
    let query = supabaseAdmin.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    if (!body.all) {
      const ids = (body.ids || []).slice(0, 20);
      if (!ids.length) return socialJson({ updated: 0 });
      query = query.in("id", ids);
    }
    const { error, count } = await query;
    if (error) throw error;
    return socialJson({ updated: count || 0 });
  } catch (error) { return socialError(error); }
}
