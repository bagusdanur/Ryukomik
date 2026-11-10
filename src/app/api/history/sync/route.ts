import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/social/auth";
import { authErrorResponse } from "@/lib/social/authResponse";
import { socialQuery, socialTransaction } from "@/lib/social/db";
import { activePremium } from "@/lib/chapterAccessPolicy";
import { historyLimitForPremium } from "@/lib/historyLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingHistory = {
  comic_slug?: unknown;
  last_chapter_slug?: unknown;
  last_chapter?: unknown;
  title?: unknown;
  source?: unknown;
  thumbnail?: unknown;
  read_at?: unknown;
};

type PremiumAccessRow = {
  is_premium?: boolean | null;
  premium_until?: string | null;
};

async function historyLimitForUser(userId: string): Promise<{ limit: number; isPremium: boolean }> {
  const { rows } = await socialQuery<PremiumAccessRow>(
    "select is_premium, premium_until from social_profiles where user_id = $1",
    [userId],
  );
  const isPremium = activePremium(rows[0] || null);
  return { limit: historyLimitForPremium(isPremium), isPremium };
}

function textField(value: unknown, max: number): string | null {
  return typeof value === "string" ? value.trim().slice(0, max) || null : null;
}

function httpsField(value: unknown, max: number): string | null {
  const v = textField(value, max);
  return v && v.startsWith("https://") ? v : null;
}

/**
 * Sinkron riwayat baca antar-perangkat.
 * GET  -> tarik riwayat server (untuk merge di perangkat baru).
 * POST -> full-replace riwayat user dari localStorage (meniru bookmark_sync).
 */
export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const { limit } = await historyLimitForUser(userId);
    const { rows } = await socialQuery<{
      comic_slug: string;
      last_chapter_slug: string | null;
      last_chapter: string | null;
      title: string | null;
      source: string | null;
      thumbnail: string | null;
      read_at: string;
    }>(
      `select comic_slug, last_chapter_slug, last_chapter, title, source, thumbnail, read_at
         from history_sync where user_id = $1 order by read_at desc limit $2`,
      [userId, limit],
    );
    return NextResponse.json({ success: true, history: rows, limit }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[history-sync GET] gagal:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Gagal memuat riwayat." }, { status: 500 });
  }
}

/** Hapus riwayat: satu komik (comic_slug) atau seluruh riwayat (all: true). */
export async function DELETE(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = (await request.json().catch(() => null)) as { comic_slug?: unknown; all?: unknown } | null;

    if (body?.all === true) {
      await socialQuery("delete from history_sync where user_id = $1", [userId]);
      return NextResponse.json({ success: true, deleted: "all" }, { headers: { "Cache-Control": "no-store" } });
    }

    const slug = textField(body?.comic_slug, 300);
    if (!slug) return NextResponse.json({ error: "comic_slug wajib diisi." }, { status: 400 });

    await socialQuery("delete from history_sync where user_id = $1 and comic_slug = $2", [userId, slug]);
    return NextResponse.json({ success: true, comic_slug: slug }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[history-sync DELETE] gagal:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Gagal menghapus riwayat." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = (await request.json().catch(() => null)) as { history?: unknown } | null;
    const raw = Array.isArray(body?.history) ? (body.history as IncomingHistory[]) : [];

    const { limit, isPremium } = await historyLimitForUser(userId);
    // User yang sudah punya riwayat lama tidak dihapus paksa (sama seperti
    // bookmark): daftar tidak boleh membesar melewati batas, tapi isi lama
    // tetap aman.
    const { rows: existingRows } = await socialQuery<{ n: string }>(
      "select count(*)::text as n from history_sync where user_id = $1",
      [userId],
    );
    const existingCount = Number(existingRows[0]?.n || 0);
    const effectiveLimit = Math.max(limit, existingCount);
    if (raw.length > effectiveLimit) {
      return NextResponse.json(
        { error: "Batas riwayat tercapai.", limit, isPremium },
        { status: 413 },
      );
    }

    const rows = raw
      .slice(0, effectiveLimit)
      .map((item) => {
        const readAtRaw = typeof item.read_at === "string" ? Date.parse(item.read_at) : NaN;
        return {
          comic_slug: textField(item.comic_slug, 300) || "",
          last_chapter_slug: textField(item.last_chapter_slug, 500),
          last_chapter: textField(item.last_chapter, 120),
          title: textField(item.title, 300),
          source: textField(item.source, 60),
          thumbnail: httpsField(item.thumbnail, 2000),
          read_at: Number.isFinite(readAtRaw) ? new Date(readAtRaw).toISOString() : new Date().toISOString(),
        };
      })
      .filter((row) => row.comic_slug.length > 0);

    await socialTransaction(async (client) => {
      await client.query("delete from history_sync where user_id = $1", [userId]);
      if (!rows.length) return;
      await client.query(
        `insert into history_sync (user_id, comic_slug, last_chapter_slug, last_chapter, title, source, thumbnail, read_at)
         select $1, * from unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::timestamptz[])
         on conflict (user_id, comic_slug) do update
           set last_chapter_slug = excluded.last_chapter_slug, last_chapter = excluded.last_chapter,
               title = excluded.title, source = excluded.source, thumbnail = excluded.thumbnail,
               read_at = excluded.read_at`,
        [
          userId,
          rows.map((r) => r.comic_slug),
          rows.map((r) => r.last_chapter_slug),
          rows.map((r) => r.last_chapter),
          rows.map((r) => r.title),
          rows.map((r) => r.source),
          rows.map((r) => r.thumbnail),
          rows.map((r) => r.read_at),
        ],
      );
    });

    return NextResponse.json({ success: true, count: rows.length });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[history-sync POST] gagal:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Gagal menyinkronkan riwayat." }, { status: 500 });
  }
}
