import { unstable_cache } from "next/cache";
import { socialError, socialJson } from "@/lib/social/http";
import { supabaseAdmin } from "@/lib/supabaseServer";

const getPublicPosts = unstable_cache(async (username: string, cursor: string | null) => {
  const { data: profile, error: profileError } = await supabaseAdmin.from("profiles").select("id").ilike("username", username).limit(1).maybeSingle();
  if (profileError) throw profileError; if (!profile) return null;
  let query = supabaseAdmin.from("social_posts")
    .select("id, author_id, content, image_url, likes_count, replies_count, created_at")
    .eq("author_id", profile.id).eq("visibility", "public").is("parent_id", null)
    .order("created_at", { ascending: false }).limit(21);
  if (cursor) query = query.lt("created_at", cursor);
  const { data, error } = await query; if (error) throw error;
  const rows = data || []; const items = rows.slice(0, 20);
  return { items, nextCursor: rows.length > 20 ? items.at(-1)?.created_at : null };
}, ["public-social-posts-v1"], { revalidate: 120, tags: ["social-posts", "social-profile"] });

export async function GET(request: Request, context: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await context.params; const cursor = new URL(request.url).searchParams.get("cursor");
    const result = await getPublicPosts(decodeURIComponent(username), cursor);
    if (!result) return socialJson({ error: "Profil tidak ditemukan." }, { status: 404 });
    return socialJson(result, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
  } catch (error) { return socialError(error); }
}
