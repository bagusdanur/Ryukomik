import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/social/auth";
import { authErrorResponse } from "@/lib/social/authResponse";
import { socialTransaction } from "@/lib/social/db";

export const runtime = "nodejs";

type IncomingBookmark = {
  comic_slug?: unknown;
  source?: unknown;
  title?: unknown;
  image?: unknown;
};

const MAX_BOOKMARKS = 500;

/**
 * Sinkronisasi penuh bookmark user dari localStorage ke Postgres lokal.
 * Body: { bookmarks: [{ comic_slug, source, title, image }] }
 *
 * Full-replace dalam satu transaksi: hapus baris user lalu insert batch, jadi
 * isi tabel selalu sama dengan localStorage (perilaku sama seperti versi
 * Supabase sebelumnya).
 */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = (await request.json().catch(() => null)) as { bookmarks?: unknown } | null;
    const raw = Array.isArray(body?.bookmarks) ? (body.bookmarks as IncomingBookmark[]) : [];

    const rows = raw
      .slice(0, MAX_BOOKMARKS)
      .map((item) => ({
        comic_slug: typeof item?.comic_slug === "string" ? item.comic_slug.trim().slice(0, 300) : "",
        source: typeof item?.source === "string" ? item.source.trim().slice(0, 60) || null : null,
        title: typeof item?.title === "string" ? item.title.trim().slice(0, 300) || null : null,
        image: typeof item?.image === "string" && item.image.startsWith("https://") ? item.image.slice(0, 2000) : null,
      }))
      .filter((row) => row.comic_slug.length > 0);

    await socialTransaction(async (client) => {
      await client.query("delete from bookmark_sync where user_id = $1", [userId]);
      if (!rows.length) return;
      await client.query(
        `insert into bookmark_sync (user_id, comic_slug, source, title, image)
         select $1, * from unnest($2::text[], $3::text[], $4::text[], $5::text[])
         on conflict (user_id, comic_slug) do update
           set source = excluded.source, title = excluded.title, image = excluded.image, synced_at = now()`,
        [
          userId,
          rows.map((r) => r.comic_slug),
          rows.map((r) => r.source),
          rows.map((r) => r.title),
          rows.map((r) => r.image),
        ],
      );
    });

    return NextResponse.json({ success: true, count: rows.length });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[bookmark-sync] gagal:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Gagal menyinkronkan bookmark." }, { status: 500 });
  }
}
