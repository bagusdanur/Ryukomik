import { socialQuery } from "@/lib/social/db";
import { ensureSocialProfile } from "@/lib/social/profileSync";
import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { decodeSocialCursor, encodeSocialCursor } from "@/lib/social/cursor";
import { supabaseAdmin } from "@/lib/supabaseServer";

const COLUMNS = "id, user_id, actor_id, actor_name, type, slug, chapter, target_id, is_read, created_at";
const SOCIAL_TYPES = ["new_follower", "social_like", "social_reply", "social_mention", "social_collection"];
const SOCIAL_TYPES_FILTER = `(${SOCIAL_TYPES.join(",")})`;

type NotificationRow = {
  id: string;
  user_id?: string;
  actor_id?: string | null;
  actor_name?: string | null;
  type?: string | null;
  slug?: string | null;
  chapter?: string | null;
  target_id?: string | null;
  is_read?: boolean;
  created_at: string;
};

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    if (!socialLimit(request, userId, 65)) {
      return socialJson({ error: "Terlalu banyak permintaan." }, { status: 429 });
    }

    await ensureSocialProfile(userId);
    const cursor = decodeSocialCursor(new URL(request.url).searchParams.get("cursor"));
    const [socialResult, legacyResult] = await Promise.all([
      socialQuery<NotificationRow>(
        `select ${COLUMNS} from social_notifications where user_id=$1
         and ($2::timestamptz is null or (created_at,id) < ($2::timestamptz,$3::uuid))
         order by created_at desc,id desc limit 41`,
        [userId, cursor?.createdAt || null, cursor?.id || null],
      ),
      (() => {
        let query = supabaseAdmin
          .from("notifications")
          .select(COLUMNS)
          .eq("user_id", userId)
          .not("type", "in", SOCIAL_TYPES_FILTER)
          .order("created_at", { ascending: false })
          .limit(41);
        if (cursor?.createdAt) query = query.lt("created_at", cursor.createdAt);
        return query;
      })(),
    ]);

    if (legacyResult.error) throw legacyResult.error;
    const merged = [
      ...socialResult.rows,
      ...((legacyResult.data || []) as NotificationRow[]),
    ].sort((a, b) => {
      const time = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return time || String(b.id).localeCompare(String(a.id));
    });
    const items = merged.slice(0, 20);
    const last = items.at(-1);

    return socialJson(
      {
        items,
        unreadCount: items.filter((item) => !item.is_read).length,
        nextCursor: merged.length > 20 && last ? encodeSocialCursor(last.created_at, last.id) : null,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return socialError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireUserId(request);
    const body = (await request.json()) as { ids?: string[]; all?: boolean };
    await ensureSocialProfile(userId);

    if (body.all) {
      const [socialResult, legacyResult] = await Promise.all([
        socialQuery("update social_notifications set is_read=true,read_at=now() where user_id=$1 and not is_read returning id", [userId]),
        supabaseAdmin
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", userId)
          .eq("is_read", false)
          .not("type", "in", SOCIAL_TYPES_FILTER)
          .select("id"),
      ]);
      if (legacyResult.error) throw legacyResult.error;
      return socialJson({ updated: (socialResult.rowCount || 0) + (legacyResult.data?.length || 0) });
    }

    const ids = [...new Set(body.ids || [])].slice(0, 50);
    if (!ids.length) return socialJson({ updated: 0 });
    const [socialResult, legacyResult] = await Promise.all([
      socialQuery("update social_notifications set is_read=true,read_at=now() where user_id=$1 and not is_read and id=any($2::uuid[]) returning id", [userId, ids]),
      supabaseAdmin
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false)
        .in("id", ids)
        .not("type", "in", SOCIAL_TYPES_FILTER)
        .select("id"),
    ]);
    if (legacyResult.error) throw legacyResult.error;
    return socialJson({ updated: (socialResult.rowCount || 0) + (legacyResult.data?.length || 0) });
  } catch (error) {
    return socialError(error);
  }
}
