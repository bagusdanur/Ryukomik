import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Notifikasi in-app Scanlator. GET: daftar + jumlah belum dibaca. POST: tandai dibaca. */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const [list, unread] = await Promise.all([
      socialQuery<{
        id: string; type: string; title: string; body: string | null; link: string | null;
        read_at: string | null; created_at: string;
      }>(
        `select id::text as id, type, title, body, link, read_at, created_at
           from scanlator_notifications where user_id = $1
          order by created_at desc limit 30`,
        [userId],
      ),
      socialQuery<{ count: string }>(
        "select count(*)::text as count from scanlator_notifications where user_id = $1 and read_at is null",
        [userId],
      ),
    ]);
    return NextResponse.json(
      { success: true, notifications: list.rows, unread: Number(unread.rows[0]?.count || 0) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal memuat notifikasi." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = (await request.json().catch(() => null)) as { id?: string; all?: boolean } | null;
    if (body?.all) {
      await socialQuery("update scanlator_notifications set read_at = now() where user_id = $1 and read_at is null", [userId]);
      return NextResponse.json({ success: true });
    }
    if (!body?.id || !/^[0-9a-f-]{36}$/i.test(body.id)) {
      return NextResponse.json({ error: "ID notifikasi tidak valid." }, { status: 400 });
    }
    await socialQuery(
      "update scanlator_notifications set read_at = now() where id = $1 and user_id = $2 and read_at is null",
      [body.id, userId],
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal menandai notifikasi." }, { status: 500 });
  }
}
