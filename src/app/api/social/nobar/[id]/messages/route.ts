import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { cleanMessage } from "@/lib/social/nobar";
import { publish } from "@/lib/social/nobarBus";
import { ensureSocialProfile } from "@/lib/social/profileSync";

/**
 * /api/social/nobar/[id]/messages — kirim chat nobar.
 *
 * Nama pengirim diambil dari social_profiles (server), bukan dari klien.
 * Rate limit ketat supaya tidak jadi tempat spam.
 */

type Ctx = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: Ctx) {
  try {
    assertSameOrigin(request);
    const userId = await requireUserId(request);
    await ensureSocialProfile(userId);
    const { id } = await context.params;
    if (!UUID.test(id)) return socialJson({ error: "Ruang tidak ditemukan." }, { status: 404 });
    if (!socialLimit(request, userId, 30)) return socialJson({ error: "Pelan sedikit ya." }, { status: 429 });

    const body = (await request.json()) as { body?: string };
    const text = cleanMessage(body.body);
    if (!text) return socialJson({ error: "Pesan kosong." }, { status: 400 });

    const active = await socialQuery<{ id: string }>(
      "select id from nobar_rooms where id=$1 and ended_at is null",
      [id],
    );
    if (!active.rowCount) return socialJson({ error: "Ruang sudah berakhir." }, { status: 410 });

    const inserted = await socialQuery<{ id: string; name: string; created_at: string; seq: string }>(
      `insert into nobar_messages(room_id,user_id,name,body)
       select $1, $2, p.username, $3 from social_profiles p where p.user_id=$2
       returning id, name, created_at, seq`,
      [id, userId, text],
    );

    const row = inserted.rows[0];
    const message = {
      id: row.id,
      userId,
      name: row.name,
      body: text,
      createdAt: row.created_at,
      seq: Number(row.seq),
    };

    // Dorong ke semua klien ruang ini SEKETIKA (bukan menunggu poll berikutnya).
    publish(id, { kind: "chat", message });

    return socialJson({ message }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return socialError(error);
  }
}
