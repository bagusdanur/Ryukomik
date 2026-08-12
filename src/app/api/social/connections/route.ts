import { requireUserId } from "@/lib/social/auth";
import { socialError, socialJson } from "@/lib/social/http";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  try {
    const viewerId = await requireUserId(request);
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") || viewerId;
    const mode = url.searchParams.get("mode") === "following" ? "following" : "followers";
    const cursor = url.searchParams.get("cursor");
    let query = supabaseAdmin.from("user_follows")
      .select(mode === "followers" ? "follower_id, created_at" : "following_id, created_at")
      .eq(mode === "followers" ? "following_id" : "follower_id", userId)
      .order("created_at", { ascending: false }).limit(21);
    if (cursor) query = query.lt("created_at", cursor);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []) as unknown as Array<{ follower_id?: string; following_id?: string; created_at: string }>;
    const page = rows.slice(0, 20);
    const ids = page
      .map((row) => mode === "followers" ? row.follower_id : row.following_id)
      .filter((id): id is string => Boolean(id));
    const { data: profiles, error: profileError } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, username, avatar_url, bio, level, is_premium").in("id", ids)
      : { data: [], error: null };
    if (profileError) throw profileError;
    const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));
    const items = page.map((row) => {
      const id = (mode === "followers" ? row.follower_id : row.following_id) || "";
      return { ...(byId.get(id) || {}), created_at: row.created_at };
    });
    return socialJson(
      { items, nextCursor: rows.length > 20 ? page.at(-1)?.created_at : null },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch (error) {
    return socialError(error);
  }
}
