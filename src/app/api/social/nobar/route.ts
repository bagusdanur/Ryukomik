import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialQuery, socialTransaction } from "@/lib/social/db";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { ROOM_IDLE_MINUTES, toRoom, type NobarRoomRow } from "@/lib/social/nobar";
import { ensureSocialProfile } from "@/lib/social/profileSync";

/**
 * /api/social/nobar
 *
 * GET  ?slug=<episode>  -> ruang aktif episode ini (untuk badge di halaman
 *                          episode) + jumlah peserta. Publik, tanpa login.
 * POST { episodeSlug, episodeTitle?, playerLabel? } -> buat ruang baru (host
 *                          = pemanggil). Ruang aktif lama episode ini ditutup.
 *
 * Semua di PostgreSQL VPS; tidak ada query Supabase.
 */

const ACTIVE_ROOM = `select r.*,
  (select count(*) from nobar_members m
     where m.room_id=r.id and m.last_seen > now() - interval '45 seconds')::int member_count
  from nobar_rooms r`;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slug = String(url.searchParams.get("slug") || "").trim().slice(0, 200);
    if (!slug) return socialJson({ error: "Episode tidak disebutkan." }, { status: 400 });

    // Tutup ruang nganggur episode ini sekalian (lazy, tanpa cron).
    await closeIdleRooms(slug);

    const result = await socialQuery<NobarRoomRow & { member_count: number }>(
      `${ACTIVE_ROOM} where r.episode_slug=$1 and r.ended_at is null
       order by r.created_at desc limit 1`,
      [slug],
    );
    const row = result.rows[0];
    if (!row) return socialJson({ room: null, memberCount: 0 }, { headers: { "Cache-Control": "no-store" } });
    return socialJson(
      { room: toRoom(row), memberCount: row.member_count },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return socialError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireUserId(request);
    await ensureSocialProfile(userId);
    if (!socialLimit(request, userId, 10)) return socialJson({ error: "Terlalu banyak membuat ruang." }, { status: 429 });

    const body = (await request.json()) as { episodeSlug?: string; episodeTitle?: string; playerLabel?: string; playerUrl?: string };
    const episodeSlug = String(body.episodeSlug || "").trim().slice(0, 200);
    if (!episodeSlug) return socialJson({ error: "Episode tidak disebutkan." }, { status: 400 });
    const episodeTitle = body.episodeTitle ? String(body.episodeTitle).trim().slice(0, 200) : null;
    const playerLabel = body.playerLabel ? String(body.playerLabel).trim().slice(0, 60) : null;
    // URL iframe server yang dipilih host; dipakai semua penonton supaya
    // menonton aliran yang sama.
    const playerUrl = body.playerUrl && /^https?:\/\//i.test(body.playerUrl) ? String(body.playerUrl).trim().slice(0, 2048) : null;

    const room = await socialTransaction(async (client) => {
      const profile = await client.query<{ username: string; avatar_url: string | null }>(
        "select username, avatar_url from social_profiles where user_id=$1",
        [userId],
      );
      const name = profile.rows[0]?.username || "Host";

      // Satu ruang aktif per episode: tutup milik sendiri/ruang lama dulu.
      await client.query(
        "update nobar_rooms set ended_at=now() where episode_slug=$1 and ended_at is null",
        [episodeSlug],
      );
      const inserted = await client.query<NobarRoomRow>(
        `insert into nobar_rooms(episode_slug,episode_title,host_id,host_name,player_label,player_url)
         values($1,$2,$3,$4,$5,$6) returning *`,
        [episodeSlug, episodeTitle, userId, name, playerLabel, playerUrl],
      );
      await client.query(
        `insert into nobar_members(room_id,user_id,name,avatar_url) values($1,$2,$3,$4)
         on conflict (room_id,user_id) do update set name=excluded.name, avatar_url=excluded.avatar_url, last_seen=now()`,
        [inserted.rows[0].id, userId, name, profile.rows[0]?.avatar_url ?? null],
      );
      return inserted.rows[0];
    });

    return socialJson({ room: toRoom(room) }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return socialError(error);
  }
}

/** Tandai ruang episode ini selesai bila tak ada aktivitas playback sekian lama. */
export async function closeIdleRooms(slug?: string) {
  await socialQuery(
    `update nobar_rooms set ended_at=now()
      where ended_at is null
        and playback_updated_at < now() - ($1 || ' minutes')::interval
        ${slug ? "and episode_slug=$2" : ""}`,
    slug ? [ROOM_IDLE_MINUTES, slug] : [ROOM_IDLE_MINUTES],
  );
}
