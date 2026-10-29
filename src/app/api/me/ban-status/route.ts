import { NextResponse } from "next/server";
import { bearerToken } from "@/lib/social/auth";
import { getCachedRole, getVerifiedUserId } from "@/lib/serverRoleCache";
import { socialQuery } from "@/lib/social/db";

export const runtime = "nodejs";

/** Ambil `sub` dari payload JWT tanpa verifikasi tanda tangan (khusus UI gate). */
function readSubject(token: string): string {
  try {
    const [, payload] = token.split(".");
    if (!payload) return "";
    const json = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as {
      sub?: string;
      exp?: number;
    };
    if (!json?.sub) return "";
    if (typeof json.exp === "number" && json.exp * 1000 < Date.now()) return "";
    return json.sub;
  } catch {
    return "";
  }
}

/**
 * Status blokir untuk user yang sedang login. Dipakai <BanGate> di root layout
 * supaya akun yang diblokir benar-benar tidak bisa memakai situs (hanya bisa
 * logout), bukan sekadar ditolak per-API.
 */
export async function GET(request: Request) {
  const token = bearerToken(request);
  if (!token) return NextResponse.json({ banned: false });

  let userId: string;
  try {
    userId = await getVerifiedUserId(token);
  } catch {
    // Supabase mencabut sesi saat akun diblokir, jadi token yang masih ada di
    // browser gagal diverifikasi. Untuk gerbang UI kita tetap perlu tahu siapa
    // pemiliknya: baca klaim `sub` (tanpa mempercayai isi lain) lalu cek DB.
    userId = readSubject(token);
    if (!userId) return NextResponse.json({ banned: false });
  }

  try {
    const role = await getCachedRole(userId);
    if (!role.isBanned) return NextResponse.json({ banned: false });

    const { rows } = await socialQuery<{ ban_reason: string | null; banned_until: string | null }>(
      "select ban_reason, banned_until from social_profiles where user_id = $1",
      [userId],
    );

    const response = NextResponse.json({
      banned: true,
      permanent: !role.bannedUntil,
      bannedUntil: role.bannedUntil,
      reason: rows[0]?.ban_reason || null,
      contactUrl: process.env.NEXT_PUBLIC_BAN_CONTACT_URL || "https://chat.whatsapp.com/JJjlXcgdm90H5qNaJiXPDV",
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.json({ banned: false });
  }
}
