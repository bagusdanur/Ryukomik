import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/social/auth";
import { authErrorResponse } from "@/lib/social/authResponse";
import { socialQuery } from "@/lib/social/db";

export const runtime = "nodejs";

/** Daftar koleksi baca milik user (bukan social_collections). */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const { rows } = await socialQuery(
      `select c.id, c.name, c.is_public, c.created_at, c.updated_at,
              (select count(*)::int from user_collection_items i where i.collection_id = c.id) as items_count
         from user_collections c
        where c.user_id = $1
        order by c.updated_at desc`,
      [userId],
    );
    return NextResponse.json({ collections: rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal memuat koleksi." }, { status: 500 });
  }
}

/** Buat koleksi baru. */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = (await request.json().catch(() => null)) as { name?: unknown; isPublic?: unknown } | null;
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";
    if (!name) return NextResponse.json({ error: "Nama koleksi wajib." }, { status: 400 });

    const { rows } = await socialQuery<{ id: string }>(
      "insert into user_collections (user_id, name, is_public) values ($1, $2, $3) returning id::text as id",
      [userId, name, body?.isPublic !== false],
    );
    return NextResponse.json({ success: true, id: rows[0].id });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal membuat koleksi." }, { status: 500 });
  }
}
