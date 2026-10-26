import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";

/**
 * Jumlah notifikasi belum dibaca — versi ringan untuk badge di bottom nav.
 *
 * Sengaja TIDAK memakai /api/social/notifications (yang menarik 20 baris +
 * pengumuman): badge hanya butuh satu COUNT, jadi poll-nya murah.
 */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    if (!socialLimit(request, userId, 120)) {
      return socialJson({ error: "Terlalu banyak permintaan." }, { status: 429 });
    }

    const { rows } = await socialQuery<{ count: number }>(
      `select (
         (select count(*) from social_notifications n
           where n.user_id = $1 and not n.is_read)
         +
         (select count(*) from social_announcements a
            join social_profiles v on v.user_id = $1
            left join social_announcement_reads r
              on r.announcement_id = a.id and r.user_id = $1
           where a.is_active
             and a.published_at <= now()
             and (a.expires_at is null or a.expires_at > now())
             and r.user_id is null
             and (a.audience = 'all'
               or (a.audience = 'premium' and v.is_premium)
               or (a.audience = 'free' and not v.is_premium)))
       )::int as count`,
      [userId],
    );

    return socialJson(
      { count: Number(rows[0]?.count || 0) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return socialError(error);
  }
}
