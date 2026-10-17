import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { NOBAR_EMOJIS } from "@/lib/social/nobar";
import { publish } from "@/lib/social/nobarBus";
import { ensureSocialProfile } from "@/lib/social/profileSync";

/**
 * /api/social/nobar/[id]/reactions — reaksi cepat (🔥😂😱😭👏❤️).
 *
 * Satu reaksi per orang per emoji (PK di skema), jadi tinggal upsert.
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
    if (!socialLimit(request, userId, 60)) return socialJson({ error: "Pelan sedikit ya." }, { status: 429 });

    const body = (await request.json()) as { emoji?: string };
    const emoji = String(body.emoji || "").trim();
    if (!(NOBAR_EMOJIS as readonly string[]).includes(emoji)) {
      return socialJson({ error: "Emoji tidak dikenal." }, { status: 400 });
    }

    const active = await socialQuery<{ id: string }>(
      "select id from nobar_rooms where id=$1 and ended_at is null",
      [id],
    );
    if (!active.rowCount) return socialJson({ error: "Ruang sudah berakhir." }, { status: 410 });

    await socialQuery(
      `insert into nobar_reactions(room_id,user_id,emoji) values($1,$2,$3)
       on conflict (room_id,user_id,emoji) do update set created_at=now()`,
      [id, userId, emoji],
    );
    // Beri tahu klien lain supaya angka reaksi ikut segar seketika.
    publish(id, { kind: "reaction" });
    return socialJson({ success: true }, { status: 201 });
  } catch (error) {
    return socialError(error);
  }
}
