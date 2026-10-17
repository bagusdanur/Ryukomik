import "server-only";

/**
 * Bus event nobar (in-memory).
 *
 * Dipakai untuk mendorong perubahan ke klien lewat SSE secara seketika, tanpa
 * polling. Karena frontend berjalan sebagai SATU proses PM2 (fork), bus memori
 * sudah cukup — tidak perlu Redis. Kalau nanti di-cluster, ganti ke Postgres
 * LISTEN/NOTIFY atau Redis di satu tempat ini saja.
 *
 * Disimpan di globalThis supaya tidak hilang saat modul di-reload (HMR/dev).
 */

export type NobarChatMessage = {
  id: string;
  userId: string;
  name: string;
  body: string;
  createdAt: string;
  seq: number;
};

export type NobarPlayback = {
  isPlaying: boolean;
  positionSeconds: number;
  playerLabel: string | null;
  playerUrl: string | null;
  playbackUpdatedAt: string;
  /** Jam server saat event ini dibuat — dipakai klien menghitung elapsed tanpa
   *  mencampur jam server dengan jam klien. */
  serverNow: string;
};

export type NobarSignal =
  | { kind: "chat"; message: NobarChatMessage }
  | { kind: "playback"; playback: NobarPlayback }
  | { kind: "reaction" }
  | { kind: "presence" };

type Listener = (signal: NobarSignal) => void;

type Bus = { rooms: Map<string, Set<Listener>> };

const globalForBus = globalThis as unknown as { __nobarBus?: Bus };
const bus: Bus = globalForBus.__nobarBus ?? (globalForBus.__nobarBus = { rooms: new Map() });

export function subscribe(roomId: string, listener: Listener): () => void {
  let set = bus.rooms.get(roomId);
  if (!set) {
    set = new Set();
    bus.rooms.set(roomId, set);
  }
  const room = set;
  room.add(listener);
  // Beri tahu yang lain SEKETIKA bahwa ada yang bergabung (peserta & angka
  // penonton ikut segar tanpa menunggu timer).
  if (room.size > 1) publish(roomId, { kind: "presence" });
  return () => {
    room.delete(listener);
    if (room.size === 0) bus.rooms.delete(roomId);
    else publish(roomId, { kind: "presence" });
  };
}

export function publish(roomId: string, signal: NobarSignal): void {
  const set = bus.rooms.get(roomId);
  if (!set) return;
  for (const listener of set) {
    try {
      listener(signal);
    } catch {
      /* satu listener gagal jangan sampai menghentikan yang lain */
    }
  }
}

/** Jumlah klien SSE yang sedang menonton ruang ini. */
export function roomListenerCount(roomId: string): number {
  return bus.rooms.get(roomId)?.size ?? 0;
}
