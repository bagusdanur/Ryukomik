import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOST_RE = /^(https?:\/\/)?(dana\.link|link\.dana|gopay\.co\.id|go\.gopay|trakteer\.id|tako\.id|lynk\.id|id\.lynk|ko-fi\.com|buymeacoffee\.com|saweria\.co)/i;

function cleanLink(value: unknown): string | null {
  const v = typeof value === "string" ? value.trim().slice(0, 300) : "";
  if (!v) return null;
  let url: string;
  try {
    url = new URL(v.includes("://") ? v : `https://${v}`).toString();
  } catch {
    return null;
  }
  if (!HOST_RE.test(url)) return null;
  return url;
}

/**
 * Profil Scanlator: GET milik sendiri (atau publik via ?handle=).
 * PATCH: simpan tautan donate + bio (Fase C — satu-satunya monetisasi MVP).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = (searchParams.get("handle") || "").toLowerCase();
  try {
    if (handle) {
      const { rows } = await socialQuery<{
        handle: string; team_name: string; bio: string | null;
        support_dana: string | null; support_trakteer: string | null; support_tako: string | null; support_url_lain: string | null;
        created_at: string;
      }>(
        `select handle, team_name, bio, support_dana, support_trakteer, support_tako, support_url_lain, created_at
           from scanlator_profiles where handle = $1 limit 1`,
        [handle],
      );
      if (!rows[0]) return NextResponse.json({ error: "Profil tidak ditemukan." }, { status: 404 });
      return NextResponse.json({ success: true, profile: rows[0] }, { headers: { "Cache-Control": "public, max-age=60" } });
    }
    const userId = await requireUserId(request);
    const { rows } = await socialQuery(
      `select handle, team_name, bio, support_dana, support_trakteer, support_tako, support_url_lain, created_at
         from scanlator_profiles where user_id = $1 limit 1`,
      [userId],
    );
    return NextResponse.json({ success: true, profile: rows[0] || null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal memuat profil." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const bio = typeof body?.bio === "string" ? body.bio.trim().slice(0, 1000) : null;

    const dana = cleanLink(body?.support_dana);
    const trakteer = cleanLink(body?.support_trakteer);
    const tako = cleanLink(body?.support_tako);
    const rawLain = typeof body?.support_url_lain === "string" ? body.support_url_lain.trim().slice(0, 300) : "";
    let lain: string | null = null;
    if (rawLain) {
      try {
        const url = new URL(rawLain.includes("://") ? rawLain : `https://${rawLain}`);
        if (!["http:", "https:"].includes(url.protocol) || ["localhost", "127.0.0.1"].includes(url.hostname)) {
          return NextResponse.json({ error: "Tautan donate lain tidak valid." }, { status: 400 });
        }
        lain = url.toString();
      } catch {
        return NextResponse.json({ error: "Tautan donate lain tidak valid." }, { status: 400 });
      }
    }

    const { rows } = await socialQuery(
      `update scanlator_profiles
          set bio = coalesce($1, bio), support_dana = $2, support_trakteer = $3, support_tako = $4, support_url_lain = $5, updated_at = now()
        where user_id = $6 returning handle`,
      [bio, dana, trakteer, tako, lain, userId],
    );
    if (!rows[0]) return NextResponse.json({ error: "Kamu belum Scanlator aktif." }, { status: 403 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal menyimpan." }, { status: 500 });
  }
}
