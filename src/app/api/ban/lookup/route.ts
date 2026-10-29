import { NextResponse } from "next/server";
import { socialQuery } from "@/lib/social/db";
import { evaluateBan } from "@/lib/banPolicy";

export const runtime = "nodejs";

/**
 * Detail blokir untuk layar login.
 *
 * Supabase mencabut sesi saat akun diblokir, jadi tidak ada token. Klien bisa
 * mengirim salah satu:
 *  - `userId` : user id terakhir yang tersimpan di perangkat (paling cepat), atau
 *  - `email`  : dicari lewat Supabase Admin (filter exact) saat perangkat tidak
 *               punya simpanan (mis. login dari HP/browser lain).
 *
 * Balasan hanya berisi data blokir, tidak pernah profil lain. Dibatasi per IP
 * supaya tidak bisa dipakai menebak-nebak status akun orang lain.
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthUser = { id?: string; email?: string | null; banned_until?: string | null };

/** Cari user id + banned_until dari Supabase Auth berdasarkan email exact. */
async function findAuthUserByEmail(email: string): Promise<AuthUser | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;
  try {
    const res = await fetch(`${base}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { users?: AuthUser[] } | AuthUser[];
    const list = Array.isArray(json) ? json : json.users ?? [];
    return list.find((entry) => entry.email?.toLowerCase() === email.toLowerCase()) ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ banned: false, error: "rate_limited" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { userId?: unknown; email?: unknown } | null;
  const rawUserId = typeof body?.userId === "string" ? body.userId.trim() : "";
  const rawEmail = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  let userId = UUID.test(rawUserId) ? rawUserId : "";
  let authBannedUntil: string | null = null;

  if (!userId && EMAIL.test(rawEmail)) {
    const authUser = await findAuthUserByEmail(rawEmail);
    if (authUser?.id) {
      userId = authUser.id;
      authBannedUntil = authUser.banned_until ?? null;
    }
  }

  if (!userId) return NextResponse.json({ banned: false });

  try {
    const { rows } = await socialQuery<{
      is_banned: boolean | null;
      banned_until: string | null;
      ban_reason: string | null;
    }>("select is_banned, banned_until, ban_reason from social_profiles where user_id = $1", [userId]);

    const row = rows[0];
    const localBan = evaluateBan(row);

    // Blokir bisa hanya ada di Auth (mis. di-ban dari dashboard Supabase).
    const authUntil = authBannedUntil ? Date.parse(authBannedUntil) : NaN;
    const authBanActive = Number.isFinite(authUntil) && authUntil > Date.now();

    if (!localBan.banned && !authBanActive) {
      return NextResponse.json({ banned: false });
    }

    return NextResponse.json(
      {
        banned: true,
        permanent: localBan.permanent,
        bannedUntil: localBan.expiresAt ?? row?.banned_until ?? (authBanActive ? authBannedUntil : null),
        reason: row?.ban_reason ?? null,
        contactUrl: process.env.NEXT_PUBLIC_BAN_CONTACT_URL || "https://chat.whatsapp.com/JJjlXcgdm90H5qNaJiXPDV",
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ banned: false });
  }
}
