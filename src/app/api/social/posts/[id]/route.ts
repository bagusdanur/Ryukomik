import { revalidateTag } from "next/cache";
import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { supabaseAdmin } from "@/lib/supabaseServer";

const COLUMNS = "id, author_id, parent_id, content, image_url, visibility, likes_count, replies_count, created_at, updated_at, edited_at, profiles!social_posts_author_id_fkey(username, avatar_url, level, role, is_premium)";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const viewerId = await requireUserId(request);
    const { id } = await context.params;
    const { data: post, error } = await supabaseAdmin.from("social_posts").select(COLUMNS).eq("id", id).maybeSingle();
    if (error) throw error;
    if (!post) return socialJson({ error: "Posting tidak ditemukan." }, { status: 404 });
    const [{ data: follow }, { data: blocked }, { data: liked }, { data: bookmarked }] = await Promise.all([
      supabaseAdmin.from("user_follows").select("follower_id").eq("follower_id", viewerId).eq("following_id", post.author_id).maybeSingle(),
      supabaseAdmin.from("user_blocks").select("blocker_id").or(`and(blocker_id.eq.${viewerId},blocked_id.eq.${post.author_id}),and(blocker_id.eq.${post.author_id},blocked_id.eq.${viewerId})`).limit(1),
      supabaseAdmin.from("social_post_likes").select("post_id").eq("post_id", id).eq("user_id", viewerId).maybeSingle(),
      supabaseAdmin.from("social_post_bookmarks").select("post_id").eq("post_id", id).eq("user_id", viewerId).maybeSingle(),
    ]);
    const allowed = post.visibility === "public" || post.author_id === viewerId || Boolean(follow);
    if (!allowed || blocked?.length) return socialJson({ error: "Posting tidak tersedia." }, { status: 404 });
    return socialJson({ post: { ...post, viewer_liked: Boolean(liked), viewer_bookmarked: Boolean(bookmarked), viewer_owns: post.author_id === viewerId } }, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (error) { return socialError(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const viewerId = await requireUserId(request);
    if (!socialLimit(request, viewerId, 15)) return socialJson({ error: "Terlalu banyak perubahan." }, { status: 429 });
    const { id } = await context.params;
    const body = await request.json() as { content?: string; visibility?: string };
    const content = body.content?.trim().slice(0, 500);
    if (!content) return socialJson({ error: "Posting tidak boleh kosong." }, { status: 400 });
    const visibility = body.visibility === "followers" ? "followers" : "public";
    const { data, error } = await supabaseAdmin.from("social_posts").update({ content, visibility, edited_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("author_id", viewerId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return socialJson({ error: "Posting tidak ditemukan." }, { status: 404 });
    revalidateTag("social-posts", { expire: 0 });
    revalidateTag("social-profile", { expire: 0 });
    return socialJson({ success: true });
  } catch (error) { return socialError(error); }
}
