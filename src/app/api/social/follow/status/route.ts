import { requireUserId } from "@/lib/social/auth";
import { socialError, socialJson } from "@/lib/social/http";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const targetUserId = new URL(request.url).searchParams.get("targetUserId");
    if (!targetUserId) return socialJson({ following: false });
    const { data, error } = await supabaseAdmin.from("user_follows").select("follower_id").eq("follower_id", userId).eq("following_id", targetUserId).limit(1);
    if (error) throw error;
    return socialJson({ following: Boolean(data?.length) }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) { return socialError(error); }
}
