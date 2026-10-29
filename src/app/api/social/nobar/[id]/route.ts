import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import {
  MEMBER_ACTIVE_SECONDS,
  REACTION_WINDOW_SECONDS,
  ROOM_IDLE_MINUTES,
  toRoom,
  type NobarRoomRow,
} from "@/lib/social/nobar";
import { publish } from "@/lib/social/nobarBus";
import { ensureSocialProfile } from "@/lib/social/profileSync";
import { authErrorResponse } from "@/lib/social/authResponse";

/**
 * /api/social/nobar/[id] — polling utama ruang nobar.
 *
 * GET   ?since=<createdAt|id>&v=<playbackUpdatedAt>
 *       Balasan berisi state ruang, peserta aktif, reaksi terkini, dan HANYA
 *       pesan chat baru (delta) sejak cursor `since`. Ringan dan hemat: klien
 *       berhenti polling saat tab tidak aktif.
 * PATCH { isPlaying?, positionSeconds?, playerLabel? } — host mengatur putar.
 * DELETE — host menutup ruang.
 *
 * Semua di PostgreSQL VPS; tidak ada query Supabase.
 */

type Ctx = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadRoom(id: string) {
  // Lazy auto-tutup (tanpa cron): ruang mati kalau tak ada peserta aktif
  // dalam 90 detik, atau playback sudah lama beku.
  await socialQuery(
    `update nobar_rooms r set ended_at=now()
      where r.id=$1 and r.ended_at is null
        and (
          not exists (
            select 1 from nobar_members m
             where m.room_id=r.id and m.last_seen > now() - interval '120 seconds'
          )
          or r.playback_updated_at < now() - ($2 || ' minutes')::interval
        )`,
    [id, ROOM_IDLE_MINUTES],
  );
  const result = await socialQuery<NobarRoomRow>("select * from nobar_rooms where id=$1", [id]);
  return result.rows[0] ? toRoom(result.rows[0]) : null;
}

export async function GET(request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    if (!UUID.test(id)) return socialJson({ error: "Ruang tidak ditemukan." }, { status: 404 });

    const room = await loadRoom(id);
    if (!room) return socialJson({ error: "Ruang tidak ditemukan." }, { status: 404 });

    // Heartbeat: perbarui last_seen bila sudah lewat 10 detik (hemat write).
    const viewerId = await requireUserId(request).catch(() => null);
    if (viewerId) {
      await socialQuery(
        `insert into nobar_members(room_id,user_id,name,avatar_url)
         select $1, $2, p.username, p.avatar_url from social_profiles p where p.user_id=$2
         on conflict (room_id,user_id) do update set last_seen=now()
         where nobar_members.last_seen < now() - interval '10 seconds'`,
        [id, viewerId],
      ).catch(() => {});
    }

    const url = new URL(request.url);
    const since = url.searchParams.get("since");

    const membersPromise = socialQuery<{ user_id: string; name: string; avatar_url: string | null }>(
      `select user_id, name, avatar_url from nobar_members
        where room_id=$1 and last_seen > now() - ($2 || ' seconds')::interval
        order by joined_at asc`,
      [id, MEMBER_ACTIVE_SECONDS],
    );

    const reactionsPromise = socialQuery<{ emoji: string; count: string }>(
      `select emoji, count(*)::text count from nobar_reactions
        where room_id=$1 and created_at > now() - ($2 || ' seconds')::interval
        group by emoji order by count desc`,
      [id, REACTION_WINDOW_SECONDS],
    );

    let messagesPromise;
    // Cursor delta memakai `seq` (bigint monotonik), bukan created_at — presisi
    // mikrodetik hilang saat JSON, sehingga timestamp bisa mengulang pesan.
    const sinceSeq = since && /^\d+$/.test(since) ? since : null;
    if (sinceSeq) {
      messagesPromise = socialQuery<{ id: string; user_id: string; name: string; body: string; created_at: string; seq: string }>(
        `select id,user_id,name,body,created_at,seq from nobar_messages
          where room_id=$1 and seq > $2::bigint
          order by seq asc limit 50`,
        [id, sinceSeq],
      );
    } else {
      messagesPromise = socialQuery<{ id: string; user_id: string; name: string; body: string; created_at: string; seq: string }>(
        `select * from (select id,user_id,name,body,created_at,seq from nobar_messages
          where room_id=$1 order by seq desc limit 30) t
          order by seq asc`,
        [id],
      );
    }

    const [members, reactions, messages] = await Promise.all([membersPromise, reactionsPromise, messagesPromise]);

    return socialJson(
      {
        room,
        members: members.rows.map((m) => ({
          userId: m.user_id,
          name: m.name,
          avatarUrl: m.avatar_url,
          isHost: m.user_id === room.hostId,
        })),
        reactions: reactions.rows.map((r) => ({ emoji: r.emoji, count: Number(r.count) })),
        messages: messages.rows.map((m) => ({
          id: m.id,
          userId: m.user_id,
          name: m.name,
          body: m.body,
          createdAt: m.created_at,
          seq: Number(m.seq),
        })),
        viewerId,
        serverNow: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return socialError(error);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    assertSameOrigin(request);
    const userId = await requireUserId(request);
    const { id } = await context.params;
    if (!UUID.test(id)) return socialJson({ error: "Ruang tidak ditemukan." }, { status: 404 });
    if (!socialLimit(request, userId, 120)) return socialJson({ error: "Terlalu sering." }, { status: 429 });

    const body = (await request.json()) as { isPlaying?: boolean; positionSeconds?: number; playerLabel?: string; playerUrl?: string };
    const playing = typeof body.isPlaying === "boolean" ? body.isPlaying : null;
    const position =
      typeof body.positionSeconds === "number" && Number.isFinite(body.positionSeconds)
        ? Math.max(0, Math.min(86_400, body.positionSeconds))
        : null;
    const label = body.playerLabel ? String(body.playerLabel).trim().slice(0, 60) : null;
    const playerUrl =
      body.playerUrl && /^https?:\/\//i.test(body.playerUrl) ? String(body.playerUrl).trim().slice(0, 2048) : null;

    const result = await socialQuery<{ id: string }>(
      `update nobar_rooms set
         is_playing = coalesce($3, is_playing),
         position_seconds = coalesce($4, position_seconds),
         player_label = coalesce($5, player_label),
         player_url = coalesce($6, player_url),
         playback_updated_at = now()
       where id=$1 and host_id=$2 and ended_at is null
       returning id`,
      [id, userId, playing, position, label, playerUrl],
    );
    if (!result.rowCount) return socialJson({ error: "Hanya host yang bisa mengatur putar." }, { status: 403 });

    // Dorong state putar terbaru ke semua penonton SEKETIKA (play/pause/seek).
    const fresh = await socialQuery<NobarRoomRow>("select * from nobar_rooms where id=$1", [id]);
    if (fresh.rows[0]) {
      const r = toRoom(fresh.rows[0]);
      publish(id, {
        kind: "playback",
        playback: {
          isPlaying: r.isPlaying,
          positionSeconds: r.positionSeconds,
          playerLabel: r.playerLabel,
          playerUrl: r.playerUrl,
          playbackUpdatedAt: r.playbackUpdatedAt,
          serverNow: new Date().toISOString(),
        },
      });
    }
    return socialJson({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return socialError(error);
  }
}

export async function DELETE(request: Request, context: Ctx) {
  try {
    assertSameOrigin(request);
    const userId = await requireUserId(request);
    const { id } = await context.params;
    if (!UUID.test(id)) return socialJson({ error: "Ruang tidak ditemukan." }, { status: 404 });

    const result = await socialQuery(
      "update nobar_rooms set ended_at=now() where id=$1 and host_id=$2 and ended_at is null",
      [id, userId],
    );
    if (!result.rowCount) return socialJson({ error: "Hanya host yang bisa menutup ruang." }, { status: 403 });
    return socialJson({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return socialError(error);
  }
}
