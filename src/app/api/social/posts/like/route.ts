import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { socialQuery, socialTransaction } from "@/lib/social/db";
import { ensureSocialProfile } from "@/lib/social/profileSync";
import { allowsSocialNotification } from "@/lib/social/notifications";

async function mutate(request: Request, remove: boolean) {
  assertSameOrigin(request); const userId = await requireUserId(request);
  if (!socialLimit(request, userId, 60)) return socialJson({ error: "Terlalu banyak reaksi." }, { status: 429 });
  const { postId } = await request.json() as { postId?: string }; if (!postId) return socialJson({ error: "Post tidak valid." }, { status: 400 });
  await ensureSocialProfile(userId);
  const postResult = await socialQuery<{ id: string; author_id: string; content: string }>("select id,author_id,content from social_posts where id=$1", [postId]);
  const post = postResult.rows[0];
  if (!post) return socialJson({ error: "Post tidak ditemukan." }, { status: 404 });
  if (remove) await socialQuery("delete from social_post_likes where post_id=$1 and user_id=$2", [postId, userId]);
  else await socialQuery("insert into social_post_likes(post_id,user_id) values($1,$2) on conflict do nothing", [postId, userId]);
  if (!remove && post.author_id !== userId && await allowsSocialNotification(post.author_id, "likes")) {
    await ensureSocialProfile(post.author_id);
    await socialTransaction(async (client) => {
      const actor = await client.query<{ username: string }>("select username from social_profiles where user_id=$1", [userId]);
      await client.query("insert into social_notifications(user_id,actor_id,actor_name,type,target_id) values($1,$2,$3,'social_like',$4)", [post.author_id, userId, actor.rows[0]?.username || "User", postId]);
    });
  }
  return socialJson({ liked: !remove });
}
export async function POST(request: Request) { try { return await mutate(request, false); } catch (error) { return socialError(error); } }
export async function DELETE(request: Request) { try { return await mutate(request, true); } catch (error) { return socialError(error); } }
