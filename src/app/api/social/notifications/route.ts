import { socialQuery, socialTransaction } from "@/lib/social/db";
import { ensureSocialProfile } from "@/lib/social/profileSync";
import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { decodeSocialCursor, encodeSocialCursor } from "@/lib/social/cursor";

type NotificationRow = {
  id: string;
  user_id?: string;
  actor_id?: string | null;
  actor_name?: string | null;
  type?: string | null;
  slug?: string | null;
  chapter?: string | null;
  target_id?: string | null;
  notification_title?: string | null;
  notification_message?: string | null;
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
      `with combined as (
         select n.id,n.actor_name,n.type,n.slug,n.chapter,n.target_id,n.is_read,n.created_at,
                null::text as notification_title,null::text as notification_message
         from social_notifications n where n.user_id=$1
         union all
         select a.id,'Ryukomik'::text as actor_name,'announcement'::text as type,a.link as slug,
                null::text as chapter,a.id::text as target_id,(r.user_id is not null) as is_read,
                a.published_at as created_at,a.title as notification_title,a.message as notification_message
         from social_announcements a
         join social_profiles viewer on viewer.user_id=$1
         left join social_announcement_reads r on r.announcement_id=a.id and r.user_id=$1
         where a.is_active and a.published_at<=now() and (a.expires_at is null or a.expires_at>now())
           and (a.audience='all' or (a.audience='premium' and viewer.is_premium)
                or (a.audience='free' and not viewer.is_premium))
       )
       select * from combined
       where ($2::timestamptz is null or (created_at,id) < ($2::timestamptz,$3::uuid))
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
      const updated = await socialTransaction(async (client) => {
        const personal = await client.query("update social_notifications set is_read=true,read_at=now() where user_id=$1 and not is_read returning id", [userId]);
        const announcements = await client.query(
          `insert into social_announcement_reads(announcement_id,user_id)
           select a.id,$1 from social_announcements a
           join social_profiles viewer on viewer.user_id=$1
           where a.is_active and a.published_at<=now() and (a.expires_at is null or a.expires_at>now())
             and (a.audience='all' or (a.audience='premium' and viewer.is_premium)
                  or (a.audience='free' and not viewer.is_premium))
           on conflict do nothing returning announcement_id`,
          [userId],
        );
        return (personal.rowCount || 0) + (announcements.rowCount || 0);
      });
      return socialJson({ updated });
    }

    const ids = [...new Set(body.ids || [])].slice(0, 50);
    if (!ids.length) return socialJson({ updated: 0 });
    const updated = await socialTransaction(async (client) => {
      const personal = await client.query("update social_notifications set is_read=true,read_at=now() where user_id=$1 and not is_read and id=any($2::uuid[]) returning id", [userId, ids]);
      const announcements = await client.query(
        `insert into social_announcement_reads(announcement_id,user_id)
         select id,$1 from social_announcements where id=any($2::uuid[])
         on conflict do nothing returning announcement_id`,
        [userId, ids],
      );
      return (personal.rowCount || 0) + (announcements.rowCount || 0);
    });
    return socialJson({ updated });
  } catch (error) {
    return socialError(error);
  }
}
