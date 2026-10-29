import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/social/auth";
import { authErrorResponse } from "@/lib/social/authResponse";
import { socialQuery } from "@/lib/social/db";

export const runtime = "nodejs";

const ITEM_LIMIT = 500;

function limitArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value.slice(0, ITEM_LIMIT) : [];
}

/** Baca backup milik user (riwayat + bookmark). */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const { rows } = await socialQuery<{ history: unknown; bookmarks: unknown; updated_at: string }>(
      "select history, bookmarks, updated_at from user_backup where user_id = $1",
      [userId],
    );
    if (!rows[0]) return NextResponse.json({ backup: null });

    return NextResponse.json(
      { backup: { history: limitArray(rows[0].history), bookmarks: limitArray(rows[0].bookmarks), updatedAt: rows[0].updated_at } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal memuat backup." }, { status: 500 });
  }
}

/** Simpan/ganti backup user. */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = (await request.json().catch(() => null)) as { history?: unknown; bookmarks?: unknown } | null;
    const history = limitArray(body?.history);
    const bookmarks = limitArray(body?.bookmarks);

    await socialQuery(
      `insert into user_backup (user_id, history, bookmarks, updated_at)
       values ($1, $2::jsonb, $3::jsonb, now())
       on conflict (user_id) do update
         set history = excluded.history, bookmarks = excluded.bookmarks, updated_at = now()`,
      [userId, JSON.stringify(history), JSON.stringify(bookmarks)],
    );

    return NextResponse.json({ success: true, history: history.length, bookmarks: bookmarks.length });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[backup] gagal:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Gagal menyimpan backup." }, { status: 500 });
  }
}
