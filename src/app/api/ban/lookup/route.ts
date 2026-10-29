import { NextResponse } from "next/server";
import { socialQuery } from "@/lib/social/db";
import { evaluateBan } from "@/lib/banPolicy";

export const runtime = "nodejs";

/**
 * Detail blokir untuk layar login.
 *
 * Saat akun diblokir, Supabase mencabut sesi sehingga tidak ada token untuk
 * memanggil /api/me/ban-status. Klien hanya menyimpan user id terakhir yang
 * berhasil login (localStorage `rk-last-user`), jadi endpoint ini menerima id
 * itu dan hanya membalas data blokir — bukan data profil lain. Id bersifat UUID
 * (tidak bisa ditebak) dan permintaan dibatasi per IP.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ banned: false }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { userId?: unknown } | null;
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return NextResponse.json({ banned: false });
  }

  try {
    const { rows } = await socialQuery<{
      is_banned: boolean | null;
      banned_until: string | null;
      ban_reason: string | null;
    }>("select is_banned, banned_until, ban_reason from social_profiles where user_id = $1", [userId]);

    const row = rows[0];
    const ban = evaluateBan(row);
    if (!ban.banned) return NextResponse.json({ banned: false });

    return NextResponse.json(
      {
        banned: true,
        permanent: ban.permanent,
        bannedUntil: ban.expiresAt ?? row?.banned_until ?? null,
        reason: row?.ban_reason ?? null,
        contactUrl: process.env.NEXT_PUBLIC_BAN_CONTACT_URL || "https://chat.whatsapp.com/JJjlXcgdm90H5qNaJiXPDV",
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ banned: false });
  }
}
