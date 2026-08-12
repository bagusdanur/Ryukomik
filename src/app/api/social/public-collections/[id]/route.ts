import { bearerToken } from "@/lib/social/auth";
import { decodeSocialCursor, encodeSocialCursor } from "@/lib/social/cursor";
import { socialError, socialJson } from "@/lib/social/http";
import { getVerifiedUserId } from "@/lib/serverRoleCache";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const token = bearerToken(request);
    const viewerId = token ? await getVerifiedUserId(token).catch(() => null) : null;
    const { data: collection, error } = await supabaseAdmin.from("user_collections").select("id, user_id, name, description, cover_url, visibility, items_count, updated_at").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!collection || (collection.visibility === "private" && collection.user_id !== viewerId)) return socialJson({ error: "Koleksi tidak ditemukan." }, { status: 404 });
    const { data: owner, error: ownerError } = await supabaseAdmin.from("profiles").select("username, avatar_url").eq("id", collection.user_id).maybeSingle();
    if (ownerError) throw ownerError;
    const cursor = decodeSocialCursor(new URL(request.url).searchParams.get("cursor"));
    let query = supabaseAdmin.from("user_collection_items").select("collection_id, source, slug, title, image, position, created_at").eq("collection_id", id).order("created_at", { ascending: false }).order("slug", { ascending: false }).limit(21);
    if (cursor) query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},slug.lt.${cursor.id})`);
    const { data, error: itemError } = await query;
    if (itemError) throw itemError;
    const rows = data || []; const items = rows.slice(0, 20);
    return socialJson({ collection: { ...collection, profiles: owner }, items, nextCursor: rows.length > 20 ? encodeSocialCursor(items.at(-1)?.created_at, items.at(-1)?.slug) : null }, { headers: { "Cache-Control": collection.visibility === "public" ? "public, s-maxage=300, stale-while-revalidate=300" : "private, no-store" } });
  } catch (error) { return socialError(error); }
}
