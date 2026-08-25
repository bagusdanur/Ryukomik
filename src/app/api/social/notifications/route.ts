import { socialQuery } from "@/lib/social/db";
import { ensureSocialProfile } from "@/lib/social/profileSync";
import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { decodeSocialCursor, encodeSocialCursor } from "@/lib/social/cursor";

const COLUMNS = "id, actor_name, type, slug, chapter, target_id, is_read, created_at";

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
    const searchParams = new URL(request.url).searchParams;
    const cursor = decodeSocialCursor(searchParams.get("cursor"));
    const requestedAfter = searchParams.get("after");
    const after = requestedAfter && Number.isFinite(Date.parse(requestedAfter))
      ? new Date(requestedAfter).toISOString()
      : null;
    const result = await socialQuery<NotificationRow>(
      `select ${COLUMNS} from social_notifications where user_id=$1
       and ($2::timestamptz is null or (created_at,id) < ($2::timestamptz,$3::uuid))
       and ($4::timestamptz is null or created_at > $4::timestamptz)
       order by created_at desc,id desc limit 21`,
      [userId, cursor?.createdAt || null, cursor?.id || null, after],
    );
    const items = result.rows.slice(0, 20);
    const last = items.at(-1);

    return socialJson(
      {
        items,
        unreadCount: items.filter((item) => !item.is_read).length,
        nextCursor: result.rows.length > 20 && last ? encodeSocialCursor(last.created_at, last.id) : null,
        incremental: Boolean(after),
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
      const result = await socialQuery("update social_notifications set is_read=true,read_at=now() where user_id=$1 and not is_read returning id", [userId]);
      return socialJson({ updated: result.rowCount || 0 });
    }

    const ids = [...new Set(body.ids || [])].slice(0, 50);
    if (!ids.length) return socialJson({ updated: 0 });
    const result = await socialQuery("update social_notifications set is_read=true,read_at=now() where user_id=$1 and not is_read and id=any($2::uuid[]) returning id", [userId, ids]);
    return socialJson({ updated: result.rowCount || 0 });
  } catch (error) {
    return socialError(error);
  }
}
