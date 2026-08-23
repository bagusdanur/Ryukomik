import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { socialQuery } from "@/lib/social/db";
import { ensureSocialProfile } from "@/lib/social/profileSync";

async function mutate(request: Request, remove: boolean) {
  assertSameOrigin(request);
  const userId = await requireUserId(request);
  if (!socialLimit(request, userId, 60)) return socialJson({ error: "Terlalu banyak permintaan." }, { status: 429 });
  const { postId } = await request.json() as { postId?: string };
  if (!postId) return socialJson({ error: "Posting tidak valid." }, { status: 400 });
  await ensureSocialProfile(userId);
  const post = await socialQuery("select 1 from social_posts where id=$1", [postId]);
  if (!post.rowCount) return socialJson({ error: "Posting tidak ditemukan." }, { status: 404 });
  if (remove) await socialQuery("delete from social_post_bookmarks where post_id=$1 and user_id=$2", [postId, userId]);
  else await socialQuery("insert into social_post_bookmarks(post_id,user_id) values($1,$2) on conflict do nothing", [postId, userId]);
  return socialJson({ bookmarked: !remove });
}

export async function POST(request: Request) { try { return await mutate(request, false); } catch (error) { return socialError(error); } }
export async function DELETE(request: Request) { try { return await mutate(request, true); } catch (error) { return socialError(error); } }
