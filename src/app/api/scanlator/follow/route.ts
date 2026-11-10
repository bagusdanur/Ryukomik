import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanHandle(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 50) : "";
}

/** Status follow untuk satu grup. */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const handle = cleanHandle(new URL(request.url).searchParams.get("handle"));
    if (!handle) return NextResponse.json({ error: "handle wajib diisi." }, { status: 400 });

    const { rows } = await socialQuery<{ notify: boolean }>(
      "select notify from scanlator_follows where user_id = $1 and handle = $2 limit 1",
      [userId, handle],
    );

    return NextResponse.json(
      { success: true, following: rows.length > 0, notify: rows[0]?.notify ?? true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal memuat status follow." }, { status: 500 });
  }
}

/** Ikuti / berhenti mengikuti grup. */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const limited = rateLimitResponse(`follow:${userId}`, 60, 10 * 60 * 1000);
    if (limited) return limited;
    const body = (await request.json().catch(() => null)) as { handle?: unknown; follow?: unknown } | null;
    const handle = cleanHandle(body?.handle);
    const follow = body?.follow !== false;

    if (!handle) return NextResponse.json({ error: "handle wajib diisi." }, { status: 400 });

    const exists = await socialQuery<{ handle: string }>(
      "select handle from scanlator_profiles where handle = $1 and status <> 'revoked' limit 1",
      [handle],
    );
    if (!exists.rows[0]) return NextResponse.json({ error: "Grup tidak ditemukan." }, { status: 404 });

    if (follow) {
      await socialQuery(
        "insert into scanlator_follows (user_id, handle) values ($1, $2) on conflict (user_id, handle) do nothing",
        [userId, handle],
      );
    } else {
      await socialQuery("delete from scanlator_follows where user_id = $1 and handle = $2", [userId, handle]);
    }

    return NextResponse.json({ success: true, following: follow }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal menyimpan follow." }, { status: 500 });
  }
}
