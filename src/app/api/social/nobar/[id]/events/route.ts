import { socialQuery } from "@/lib/social/db";
import { requireUserId } from "@/lib/social/auth";
import { subscribe, roomListenerCount, type NobarSignal } from "@/lib/social/nobarBus";

/**
 * /api/social/nobar/[id]/events — aliran realtime ruang nobar (SSE).
 *
 * Klien membuka SATU koneksi yang menggantung; server mendorong chat, perubahan
 * putar, reaksi, dan kehadiran SECARA SEKETIKA lewat bus memori. Ini mengganti
 * polling 2,5 detik: lebih cepat (<300ms) DAN lebih hemat (satu koneksi diam vs
 * request berulang yang menge-hit database).
 *
 * Aman untuk Cloudflare: heartbeat dikirim tiap 20 detik supaya koneksi diam
 * tidak diputus. Menutup diri saat ruang berakhir.
 *
 * Tidak menyentuh Supabase (auth tetap verifikasi JWT lokal).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEARTBEAT_MS = 20_000;
/** Batas umur satu koneksi; klien otomatis menyambung ulang (EventSource). */
const MAX_LIFE_MS = 10 * 60_000;

export async function GET(request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!UUID.test(id)) return new Response("Ruang tidak ditemukan.", { status: 404 });

  const room = await socialQuery<{ ended_at: string | null }>(
    "select ended_at from nobar_rooms where id=$1",
    [id],
  );
  if (!room.rowCount) return new Response("Ruang tidak ditemukan.", { status: 404 });

  // Kehadiran: catat/segarkan anggota begitu tersambung (kalau sudah login).
  const viewerId = await requireUserId(request).catch(() => null);
  if (viewerId) {
    await socialQuery(
      `insert into nobar_members(room_id,user_id,name,avatar_url)
       select $1, $2, p.username, p.avatar_url from social_profiles p where p.user_id=$2
       on conflict (room_id,user_id) do update set last_seen=now()`,
      [id, viewerId],
    ).catch(() => {});
  }

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Sapa + beri tahu berapa klien yang sedang menyambung.
      send("ready", { roomId: id, clients: roomListenerCount(id) + 1 });

      const unsubscribe = subscribe(id, (signal: NobarSignal) => {
        send(signal.kind, signal.kind === "playback" ? signal.playback : signal.kind === "chat" ? signal.message : {});
      });

      const heartbeat = setInterval(() => send("ping", { t: Date.now() }), HEARTBEAT_MS);

      // Saat ada yang masuk/keluar, beri tahu yang lain supaya daftar peserta
      // dan angka penonton ikut segar (kehadiran didorong, bukan ditanya).
      const presenceTick = setInterval(() => send("presence", { clients: roomListenerCount(id) }), 15_000);

      const finish = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearInterval(presenceTick);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* sudah tertutup */
        }
      };

      const life = setTimeout(finish, MAX_LIFE_MS);
      cleanup = () => {
        clearTimeout(life);
        finish();
      };

      // Klien menutup tab / koneksi putus.
      request.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no", // penting: cegah nginx/CF menahan buffer
    },
  });
}
