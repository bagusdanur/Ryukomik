import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/social/auth";
import { authErrorResponse } from "@/lib/social/authResponse";
import { socialQuery } from "@/lib/social/db";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ubah nama / visibilitas koleksi. */
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(request);
    const { id } = await props.params;
    if (!UUID.test(id)) return NextResponse.json({ error: "id tidak valid." }, { status: 400 });

    const body = (await request.json().catch(() => null)) as { name?: unknown; isPublic?: unknown } | null;
    const sets: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (typeof body?.name === "string" && body.name.trim()) {
      sets.push(`name = $${index++}`);
      values.push(body.name.trim().slice(0, 120));
    }
    if (typeof body?.isPublic === "boolean") {
      sets.push(`is_public = $${index++}`);
      values.push(body.isPublic);
    }
    if (!sets.length) return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });

    sets.push("updated_at = now()");
    values.push(id, userId);
    await socialQuery(
      `update user_collections set ${sets.join(", ")} where id = $${index++} and user_id = $${index}`,
      values,
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal mengubah koleksi." }, { status: 500 });
  }
}

/** Hapus koleksi (item ikut terhapus lewat foreign key cascade). */
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(request);
    const { id } = await props.params;
    if (!UUID.test(id)) return NextResponse.json({ error: "id tidak valid." }, { status: 400 });

    await socialQuery("delete from user_collections where id = $1 and user_id = $2", [id, userId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal menghapus koleksi." }, { status: 500 });
  }
}
