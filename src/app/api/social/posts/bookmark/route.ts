import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { supabaseAdmin } from "@/lib/supabaseServer";

async function mutate(request: Request, remove: boolean) {
  assertSameOrigin(request);
  const userId = await requireUserId(request);
  if (!socialLimit(request, userId, 60)) return socialJson({ error: "Terlalu banyak permintaan." }, { status: 429 });
  const { postId } = await request.json() as { postId?: string };
  if (!postId) return socialJson({ error: "Posting tidak valid." }, { status: 400 });
  const { data: post } = await supabaseAdmin.from("social_posts").select("id").eq("id", postId).maybeSingle();
  if (!post) return socialJson({ error: "Posting tidak ditemukan." }, { status: 404 });
  const result = remove
    ? await supabaseAdmin.from("social_post_bookmarks").delete().eq("post_id", postId).eq("user_id", userId)
    : await supabaseAdmin.from("social_post_bookmarks").upsert({ post_id: postId, user_id: userId }, { ignoreDuplicates: true });
  if (result.error) throw result.error;
  return socialJson({ bookmarked: !remove });
}

export async function POST(request: Request) { try { return await mutate(request, false); } catch (error) { return socialError(error); } }
export async function DELETE(request: Request) { try { return await mutate(request, true); } catch (error) { return socialError(error); } }
