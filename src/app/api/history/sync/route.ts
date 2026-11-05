import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/social/auth";
import { authErrorResponse } from "@/lib/social/authResponse";
import { socialQuery, socialTransaction } from "@/lib/social/db";

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

const MAX_HISTORY = 500;

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
      [userId, MAX_HISTORY],
    );
    return NextResponse.json({ success: true, history: rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[history-sync GET] gagal:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Gagal memuat riwayat." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = (await request.json().catch(() => null)) as { history?: unknown } | null;
    const raw = Array.isArray(body?.history) ? (body.history as IncomingHistory[]) : [];

    const rows = raw
      .slice(0, MAX_HISTORY)
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
