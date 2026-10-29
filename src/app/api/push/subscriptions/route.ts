import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/social/auth";
import { authErrorResponse } from "@/lib/social/authResponse";
import {
  deletePushSubscriptionByEndpoint,
  savePushSubscription,
} from "@/lib/social/pushStore";

export const runtime = "nodejs";

/** Simpan subscription push perangkat (menggantikan tulisan langsung ke Supabase). */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = (await request.json().catch(() => null)) as
      | { endpoint?: unknown; p256dh?: unknown; auth?: unknown }
      | null;

    const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
    const p256dh = typeof body?.p256dh === "string" ? body.p256dh : "";
    const auth = typeof body?.auth === "string" ? body.auth : "";
    if (!endpoint.startsWith("https://") || endpoint.length > 2000) {
      return NextResponse.json({ error: "endpoint tidak valid." }, { status: 400 });
    }

    await savePushSubscription({ userId, endpoint, p256dh, auth });
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[push] simpan gagal:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Gagal menyimpan subscription." }, { status: 500 });
  }
}

/** Hapus subscription perangkat milik user ini. */
export async function DELETE(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
    if (!endpoint) return NextResponse.json({ error: "endpoint wajib." }, { status: 400 });

    await deletePushSubscriptionByEndpoint(endpoint, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal menghapus subscription." }, { status: 500 });
  }
}
