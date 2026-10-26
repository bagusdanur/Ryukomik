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

    // Postingan timeline baru sejak kunjungan terakhir (dikirim klien sebagai
    // `since` ISO). Dipakai untuk badge "ada postingan baru".
    const sinceRaw = new URL(request.url).searchParams.get("since");
    const since = sinceRaw && Number.isFinite(Date.parse(sinceRaw))
      ? new Date(sinceRaw).toISOString()
      : null;

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

    let newPosts = 0;
    if (since) {
      const posts = await socialQuery<{ posts: number }>(
        `select count(*)::int as posts
           from social_posts p
          where p.parent_id is null
            and p.context_type is null
            and p.visibility = 'public'
            and p.author_id <> $1
            and p.created_at > $2
            and not exists (
              select 1 from social_blocks b
               where (b.blocker_id = $1 and b.blocked_id = p.author_id)
                  or (b.blocker_id = p.author_id and b.blocked_id = $1)
            )
            and not exists (
              select 1 from social_mutes m
               where m.user_id = $1 and m.muted_id = p.author_id
            )`,
        [userId, since],
      );
      newPosts = Number(posts.rows[0]?.posts || 0);
    }

    return socialJson(
      { count: Number(rows[0]?.count || 0), newPosts },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return socialError(error);
  }
}
