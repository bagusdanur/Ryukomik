import "server-only";

import { NOBAR_EMOJIS, NOBAR_MESSAGE_MAX, NOBAR_POLL_MS } from "@/lib/social/nobarShared";
export { NOBAR_EMOJIS, NOBAR_MESSAGE_MAX, NOBAR_POLL_MS };

/**
 * Helper bersama untuk nobar (nonton bareng).
 *
 * Semua data nobar ada di PostgreSQL VPS (social DB), bukan Supabase.
 * Realtime-nya polling delta, bukan WebSocket, supaya tidak butuh Redis.
 */

export type NobarRoomRow = {
  id: string;
  episode_slug: string;
  episode_title: string | null;
  host_id: string;
  host_name: string;
  player_label: string | null;
  player_url: string | null;
  is_playing: boolean;
  position_seconds: string | number;
  playback_updated_at: string;
  created_at: string;
  ended_at: string | null;
};

export type NobarRoom = {
  id: string;
  episodeSlug: string;
  episodeTitle: string | null;
  hostId: string;
  hostName: string;
  playerLabel: string | null;
  playerUrl: string | null;
  isPlaying: boolean;
  positionSeconds: number;
  playbackUpdatedAt: string;
  createdAt: string;
  endedAt: string | null;
};

export type NobarMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  isHost: boolean;
};

export type NobarMessage = {
  id: string;
  userId: string;
  name: string;
  body: string;
  createdAt: string;
};

export type NobarReaction = { emoji: string; count: number };

/** Peserta dianggap masih hadir bila heartbeat-nya lebih muda dari ini. */
export const MEMBER_ACTIVE_SECONDS = 45;
/** Ruang tanpa aktivitas playback selama ini dianggap selesai. */
export const ROOM_IDLE_MINUTES = 20;
/** Emoji dihitung "baru" selama ini (untuk animasi mengambang). */
export const REACTION_WINDOW_SECONDS = 12;

export function toRoom(row: NobarRoomRow): NobarRoom {
  return {
    id: row.id,
    episodeSlug: row.episode_slug,
    episodeTitle: row.episode_title,
    hostId: row.host_id,
    hostName: row.host_name,
    playerLabel: row.player_label,
    playerUrl: row.player_url,
    isPlaying: Boolean(row.is_playing),
    positionSeconds: Number(row.position_seconds) || 0,
    playbackUpdatedAt: row.playback_updated_at,
    createdAt: row.created_at,
    endedAt: row.ended_at,
  };
}

/**
 * Posisi putar saat ini menurut jam server: kalau sedang diputar, posisi
 * bertambah sejak `playback_updated_at`. Klien memakai ini untuk menyesuaikan
 * diri, tapi hanya "snap" kalau selisihnya besar (>2,5s) supaya tidak goyang.
 */
export function livePosition(room: NobarRoom, now = Date.now()): number {
  const base = room.positionSeconds;
  if (!room.isPlaying || room.endedAt) return base;
  const updatedAt = new Date(room.playbackUpdatedAt).getTime();
  if (!Number.isFinite(updatedAt)) return base;
  const elapsed = Math.max(0, (now - updatedAt) / 1000);
  return base + elapsed;
}

export function cleanMessage(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
}
