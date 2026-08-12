import { revalidateTag } from "next/cache";
import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { decodeSocialCursor, encodeSocialCursor } from "@/lib/social/cursor";
import { allowsSocialNotification } from "@/lib/social/notifications";

const POST_COLUMNS = "id, author_id, parent_id, content, image_url, visibility, likes_count, replies_count, created_at, updated_at, profiles!social_posts_author_id_fkey(username, avatar_url, level, role, is_premium)";

function validMedia(value: unknown) {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("https://")) throw new Error("INVALID_MEDIA");
  const url = new URL(value);
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname)) throw new Error("INVALID_MEDIA");
  return value;
}

export async function GET(request: Request) {
  try {
    const viewerId = await requireUserId(request); const url = new URL(request.url);
    const scope = url.searchParams.get("scope") || "following";
    const profileId = url.searchParams.get("userId"); const parentId = url.searchParams.get("parentId");
    const cursor = decodeSocialCursor(url.searchParams.get("cursor"));
    const needsFollowing = scope === "following" || Boolean(parentId);
    const [{ data: follows }, { data: mutes }, { data: blocks }] = await Promise.all([
      needsFollowing
        ? supabaseAdmin.from("user_follows").select("following_id").eq("follower_id", viewerId).limit(500)
        : Promise.resolve({ data: [] as Array<{ following_id: string }> }),
      supabaseAdmin.from("user_mutes").select("muted_id").eq("user_id", viewerId).limit(500),
      supabaseAdmin.from("user_blocks").select("blocker_id, blocked_id").or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`).limit(500),
    ]);
    const followed = (follows || []).map((row) => row.following_id);
    const hidden = new Set<string>([
      ...(mutes || []).map((row) => row.muted_id),
      ...(blocks || []).map((row) => row.blocker_id === viewerId ? row.blocked_id : row.blocker_id),
    ]);
    let query = supabaseAdmin.from("social_posts").select(POST_COLUMNS)
      .order("created_at", { ascending: Boolean(parentId) }).order("id", { ascending: Boolean(parentId) }).limit(21);
    query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);
    if (scope === "following") query = query.in("author_id", [viewerId, ...followed]);
    else if (scope === "profile" && profileId) query = query.eq("author_id", profileId);
    else query = query.eq("visibility", "public");
    if (cursor) query = query.or(parentId ? `created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})` : `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
    const { data, error } = await query; if (error) throw error;
    const visible = (data || []).filter((post) => !hidden.has(post.author_id) && (post.visibility === "public" || post.author_id === viewerId || followed.includes(post.author_id)));
    const page = visible.slice(0, 20); const ids = page.map((post) => post.id);
    const { data: likedRows, error: likeError } = ids.length
      ? await supabaseAdmin.from("social_post_likes").select("post_id").eq("user_id", viewerId).in("post_id", ids)
      : { data: [], error: null };
    if (likeError) throw likeError;
    const liked = new Set((likedRows || []).map((row) => row.post_id));
    const items = page.map((post) => ({ ...post, viewer_liked: liked.has(post.id), viewer_owns: post.author_id === viewerId }));
    return socialJson({ items, nextCursor: visible.length > 20 ? encodeSocialCursor(page.at(-1)?.created_at, page.at(-1)?.id) : null }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=60", Vary: "Authorization" } });
  } catch (error) { return socialError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request); const userId = await requireUserId(request);
    if (!socialLimit(request, userId, 12)) return socialJson({ error: "Terlalu banyak posting." }, { status: 429 });
    const body = await request.json() as { content?: string; image_url?: string; visibility?: string; parent_id?: string };
    const media = validMedia(body.image_url);
    const content = body.content?.trim().slice(0, 500) || (media ? "[sticker]" : "");
    if (!content) return socialJson({ error: "Posting tidak boleh kosong." }, { status: 400 });
    const visibility = body.visibility === "followers" ? "followers" : "public";
    let parent: { id: string; author_id: string } | null = null;
    if (body.parent_id) {
      const result = await supabaseAdmin.from("social_posts").select("id, author_id").eq("id", body.parent_id).is("parent_id", null).maybeSingle();
      parent = result.data;
      if (!parent) return socialJson({ error: "Posting induk tidak ditemukan." }, { status: 404 });
    }
    const { data: actor } = await supabaseAdmin.from("profiles").select("username").eq("id", userId).maybeSingle();
    const { data, error } = await supabaseAdmin.from("social_posts").insert({ author_id: userId, parent_id: parent?.id || null, content, image_url: media, visibility }).select("id, created_at").single();
    if (error) throw error;
    if (parent && parent.author_id !== userId && await allowsSocialNotification(parent.author_id, "replies")) await supabaseAdmin.from("notifications").insert({ user_id: parent.author_id, actor_id: userId, actor_name: actor?.username || "User", type: "social_reply", target_id: parent.id, is_read: false });
    await supabaseAdmin.from("activity_events").insert({ actor_id: userId, actor_name: actor?.username || "User", event_type: parent ? "replied_post" : "created_post", entity_id: data.id, entity_label: content === "[sticker]" ? "Membagikan sticker" : content.slice(0, 80), visibility });
    revalidateTag("social-posts", { expire: 0 }); revalidateTag("social-profile", { expire: 0 });
    return socialJson({ post: data }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_MEDIA") return socialJson({ error: "Gambar wajib URL HTTPS publik." }, { status: 400 });
    return socialError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request); const userId = await requireUserId(request); const { id } = await request.json() as { id?: string };
    if (!id) return socialJson({ error: "ID posting diperlukan." }, { status: 400 });
    const { error } = await supabaseAdmin.from("social_posts").delete().eq("id", id).eq("author_id", userId); if (error) throw error;
    revalidateTag("social-posts", { expire: 0 }); return socialJson({ success: true });
  } catch (error) { return socialError(error); }
}
