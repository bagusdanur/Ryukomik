import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { authErrorResponse } from "@/lib/social/authResponse";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const { rows } = await socialQuery(
      `select id::text as id, status, updated_at from premium_requests
        where user_id = $1 order by created_at desc limit 1`,
      [userId],
    );
    return NextResponse.json({ request: rows[0] || null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json(
      { error: unauthorized ? "Login diperlukan." : "Gagal memeriksa status premium." },
      { status: unauthorized ? 401 : 500 },
    );
  }
}
