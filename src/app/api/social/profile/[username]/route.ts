import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { bearerToken } from "@/lib/social/auth";
import { socialError, socialJson } from "@/lib/social/http";
import { getVerifiedUserId } from "@/lib/serverRoleCache";

const cachedProfile = unstable_cache(async (username: string) => {
  const { data: profile, error } = await supabaseAdmin.from("profiles")
    .select("id, username, avatar_url, banner_url, bio, level, xp, role, is_premium, created_at")
    .ilike("username", username).limit(1).maybeSingle();
  if (error) throw error;
  if (!profile) return null;
  const [followers, following, collections] = await Promise.all([
    supabaseAdmin.from("user_follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profile.id),
    supabaseAdmin.from("user_follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profile.id),
    supabaseAdmin.from("user_collections").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("visibility", "public"),
  ]);
  return { ...profile, followers: followers.count || 0, following: following.count || 0, collections: collections.count || 0 };
}, ["social-profile-v1"], { revalidate: 300, tags: ["social-profile"] });

export async function GET(request: Request, context: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await context.params;
    const profile = await cachedProfile(decodeURIComponent(username));
    if (!profile) return socialJson({ error: "Profil tidak ditemukan." }, { status: 404 });
    let viewerFollowing = false;
    const token = bearerToken(request);
    if (token) {
      const viewerId = await getVerifiedUserId(token).catch(() => null);
      if (viewerId) {
        const { data } = await supabaseAdmin.from("user_follows").select("follower_id").eq("follower_id", viewerId).eq("following_id", profile.id).limit(1);
        viewerFollowing = Boolean(data?.length);
      }
    }
    return socialJson({ profile, viewerFollowing }, { headers: { "Cache-Control": token ? "private, no-store" : "public, s-maxage=300, stale-while-revalidate=300" } });
  } catch (error) { return socialError(error); }
}
