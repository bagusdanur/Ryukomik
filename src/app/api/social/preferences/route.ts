import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson } from "@/lib/social/http";
import { supabaseAdmin } from "@/lib/supabaseServer";

const DEFAULTS = { follows: true, likes: true, replies: true, mentions: true, collections: true };

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const { data, error } = await supabaseAdmin.from("social_notification_preferences").select("follows, likes, replies, mentions, collections").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return socialJson({ preferences: data || DEFAULTS }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return socialError(error); }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireUserId(request);
    const input = await request.json() as Partial<typeof DEFAULTS>;
    const preferences = Object.fromEntries(Object.keys(DEFAULTS).map((key) => [key, input[key as keyof typeof DEFAULTS] !== false]));
    const { error } = await supabaseAdmin.from("social_notification_preferences").upsert({ user_id: userId, ...preferences, updated_at: new Date().toISOString() });
    if (error) throw error;
    return socialJson({ preferences });
  } catch (error) { return socialError(error); }
}
