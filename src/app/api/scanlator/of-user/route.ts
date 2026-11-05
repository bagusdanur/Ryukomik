import { NextResponse } from "next/server";

import { socialQuery } from "@/lib/social/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Grup Scanlator milik satu user (untuk blok di profil publik /u/[username]).
 * ?username= atau ?user_id=
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = (searchParams.get("username") || "").trim();
  const userId = (searchParams.get("user_id") || "").trim();

  try {
    let uid = /^[0-9a-f-]{36}$/i.test(userId) ? userId : "";
    if (!uid && username) {
      const p = await socialQuery<{ user_id: string }>(
        "select user_id::text as user_id from social_profiles where lower(username) = lower($1) limit 1",
        [username],
      );
      uid = p.rows[0]?.user_id || "";
    }
    if (!uid) return NextResponse.json({ success: true, group: null });

    const { rows } = await socialQuery<{ handle: string; team_name: string; bio: string | null; status: string }>(
      "select handle, team_name, bio, status from scanlator_profiles where user_id = $1 and status <> 'revoked' limit 1",
      [uid],
    );
    return NextResponse.json(
      { success: true, group: rows[0] || null },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  } catch {
    return NextResponse.json({ success: true, group: null });
  }
}
