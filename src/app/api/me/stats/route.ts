import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Statistik baca pribadi user (dari data yang sudah ada, tanpa tabel baru):
 * total chapter dibaca, streak harian (WIB), bacaan 7 hari terakhir,
 * seri terakhir dibaca (history_sync), XP/level, bookmark, komentar.
 */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);

    const [profileResult, readResult, weekResult, streakResult, historyResult, bookmarkResult, commentResult] = await Promise.all([
      socialQuery<{ xp: string; level: number; total_reads: string; is_premium: boolean }>(
        "select xp::text as xp, level, coalesce(total_reads,0)::text as total_reads, is_premium from social_profiles where user_id = $1",
        [userId],
      ),
      socialQuery<{ total: string; today: string; week: string }>(
        `select count(*)::text as total,
                count(*) filter (where created_at >= (now() at time zone 'Asia/Jakarta')::date::timestamptz)::text as today,
                count(*) filter (where created_at >= now() - interval '7 days')::text as week
           from user_reads where user_id = $1`,
        [userId],
      ),
      socialQuery<{ day: string; n: string }>(
        `select to_char(d, 'YYYY-MM-DD') as day, count(u.chapter_slug)::text as n
           from generate_series((current_date - interval '6 days')::date, current_date::date, interval '1 day') d
           left join user_reads u on u.user_id = $1
             and (u.created_at at time zone 'Asia/Jakarta')::date = d::date
           group by d order by d`,
        [userId],
      ),
      socialQuery<{ streak: string }>(
        `with days as (
           select distinct ((created_at at time zone 'Asia/Jakarta')::date) as d
             from user_reads where user_id = $1
         ),
         ranked as (
           select d, d - (row_number() over (order by d))::int as grp
             from days
         )
         select coalesce(max(cnt),0)::text as streak from (
           select count(*)::int as cnt from ranked group by grp
         ) s`,
        [userId],
      ),
      socialQuery<{ comic_slug: string; title: string | null; source: string | null; last_chapter: string | null; thumbnail: string | null; read_at: string }>(
        `select comic_slug, title, source, last_chapter, thumbnail, read_at
           from history_sync where user_id = $1 order by read_at desc limit 8`,
        [userId],
      ),
      socialQuery<{ n: string }>("select count(*)::text as n from bookmark_sync where user_id = $1", [userId]),
      socialQuery<{ n: string }>(
        "select count(*)::text as n from comments where user_id = $1 and parent_id is null and deleted_at is null",
        [userId],
      ),
    ]);

    const profile = profileResult.rows[0];
    return NextResponse.json(
      {
        success: true,
        profile: profile
          ? { xp: Number(profile.xp), level: Number(profile.level), totalReads: Number(profile.total_reads), isPremium: Boolean(profile.is_premium) }
          : null,
        reads: {
          total: Number(readResult.rows[0]?.total || 0),
          today: Number(readResult.rows[0]?.today || 0),
          week: Number(readResult.rows[0]?.week || 0),
        },
        streakDays: Number(streakResult.rows[0]?.streak || 0),
        last7Days: weekResult.rows.map((r) => ({ day: r.day, count: Number(r.n) })),
        recent: historyResult.rows.map((r) => ({
          slug: r.comic_slug,
          title: r.title,
          source: r.source,
          lastChapter: r.last_chapter,
          thumbnail: r.thumbnail,
          readAt: r.read_at,
        })),
        bookmarks: Number(bookmarkResult.rows[0]?.n || 0),
        comments: Number(commentResult.rows[0]?.n || 0),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[me/stats] gagal:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Gagal memuat statistik." }, { status: 500 });
  }
}
