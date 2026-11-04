import { NextResponse } from "next/server";

import { adminErrorResponse, verifyAdminRequest } from "@/lib/adminApi";
import { socialQuery } from "@/lib/social/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Counts = {
  users: number;
  sessions_active: number;
  sessions_24h: number;
  logged_in_24h: number;
  last_login_at: string | null;
};

/**
 * Status auth lokal untuk dashboard admin.
 *
 * Menjawab satu pertanyaan: "login Google baru ini hidup atau tidak?" —
 * konfigurasi, jumlah identitas, sesi aktif, dan aktivitas login terakhir.
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const [stats] = await Promise.all([
      socialQuery<Counts>(
        `select
           (select count(*)::int from auth_users) as users,
           (select count(*)::int from auth_sessions where revoked_at is null and expires_at > now()) as sessions_active,
           (select count(*)::int from auth_sessions where created_at > now() - interval '24 hours') as sessions_24h,
           (select count(*)::int from auth_users where last_login_at > now() - interval '24 hours') as logged_in_24h,
           (select max(last_login_at)::text from auth_users) as last_login_at`,
      ),
      Promise.resolve(null),
    ]);

    return NextResponse.json(
      {
        googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        authLocalEnabled: process.env.NEXT_PUBLIC_AUTH_LOCAL === "1",
        supabaseFallback: Boolean(process.env.SUPABASE_JWT_SECRET),
        counts: stats.rows[0] ?? null,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return adminErrorResponse(error, "Gagal membaca status auth.");
  }
}
