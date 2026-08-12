import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { allowsSocialNotification } from "@/lib/social/notifications";

async function mutate(request: Request, remove: boolean) {
  assertSameOrigin(request); const userId = await requireUserId(request);
  if (!socialLimit(request, userId, 60)) return socialJson({ error: "Terlalu banyak reaksi." }, { status: 429 });
  const { postId } = await request.json() as { postId?: string }; if (!postId) return socialJson({ error: "Post tidak valid." }, { status: 400 });
  const { data: post } = await supabaseAdmin.from("social_posts").select("id, author_id, content").eq("id", postId).maybeSingle();
  if (!post) return socialJson({ error: "Post tidak ditemukan." }, { status: 404 });
  const result = remove
    ? await supabaseAdmin.from("social_post_likes").delete().eq("post_id", postId).eq("user_id", userId)
    : await supabaseAdmin.from("social_post_likes").upsert({ post_id: postId, user_id: userId }, { ignoreDuplicates: true });
  if (result.error) throw result.error;
  if (!remove && post.author_id !== userId && await allowsSocialNotification(post.author_id, "likes")) {
    const { data: actor } = await supabaseAdmin.from("profiles").select("username").eq("id", userId).maybeSingle();
    await supabaseAdmin.from("notifications").insert({ user_id: post.author_id, actor_id: userId, actor_name: actor?.username || "User", type: "social_like", target_id: postId, is_read: false });
  }
  return socialJson({ liked: !remove });
}
export async function POST(request: Request) { try { return await mutate(request, false); } catch (error) { return socialError(error); } }
export async function DELETE(request: Request) { try { return await mutate(request, true); } catch (error) { return socialError(error); } }
