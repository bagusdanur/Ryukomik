import { revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireUserId(request);
    if (!socialLimit(request, userId, 20)) return socialJson({ error: "Terlalu banyak permintaan." }, { status: 429 });
    const { targetUserId } = await request.json() as { targetUserId?: string };
    if (!targetUserId || targetUserId === userId) return socialJson({ error: "Target tidak valid." }, { status: 400 });

    const { data: target } = await supabaseAdmin.from("profiles").select("id, username").eq("id", targetUserId).maybeSingle();
    if (!target) return socialJson({ error: "User tidak ditemukan." }, { status: 404 });
    const { data: blocked } = await supabaseAdmin.from("user_blocks").select("blocker_id").or(`and(blocker_id.eq.${userId},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${userId})`).limit(1);
    if (blocked?.length) return socialJson({ error: "Interaksi tidak tersedia." }, { status: 403 });

    const { error } = await supabaseAdmin.from("user_follows").upsert(
      { follower_id: userId, following_id: targetUserId },
      { onConflict: "follower_id,following_id", ignoreDuplicates: true },
    );
    if (error) throw error;
    const { data: actor } = await supabaseAdmin.from("profiles").select("username").eq("id", userId).maybeSingle();
    await Promise.all([
      supabaseAdmin.from("notifications").insert({ user_id: targetUserId, actor_id: userId, actor_name: actor?.username || "User", type: "new_follower", target_id: userId, is_read: false }),
      supabaseAdmin.from("activity_events").insert({ actor_id: userId, actor_name: actor?.username || "User", event_type: "followed_user", entity_id: targetUserId, entity_label: target.username, visibility: "followers" }),
    ]);
    revalidateTag("social-profile", { expire: 0 });
    revalidateTag("social-feed", { expire: 0 });
    return socialJson({ following: true });
  } catch (error) { return socialError(error); }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireUserId(request);
    const { targetUserId } = await request.json() as { targetUserId?: string };
    if (!targetUserId) return socialJson({ error: "Target tidak valid." }, { status: 400 });
    const { error } = await supabaseAdmin.from("user_follows").delete().eq("follower_id", userId).eq("following_id", targetUserId);
    if (error) throw error;
    revalidateTag("social-profile", { expire: 0 });
    revalidateTag("social-feed", { expire: 0 });
    return socialJson({ following: false });
  } catch (error) { return socialError(error); }
}
