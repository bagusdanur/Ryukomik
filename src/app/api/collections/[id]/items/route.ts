import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/social/auth";
import { authErrorResponse } from "@/lib/social/authResponse";
import { socialQuery } from "@/lib/social/db";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type IncomingItem = {
  source?: unknown;
  slug?: unknown;
  title?: unknown;
  image?: unknown;
  position?: unknown;
};

function normalize(item: IncomingItem) {
  return {
    source: typeof item?.source === "string" ? item.source.trim().slice(0, 60) || null : null,
    slug: typeof item?.slug === "string" ? item.slug.trim().slice(0, 300) : "",
    title: typeof item?.title === "string" ? item.title.trim().slice(0, 300) || null : null,
    image: typeof item?.image === "string" && item.image.startsWith("https://") ? item.image.slice(0, 2000) : null,
    position: Number.isFinite(Number(item?.position)) ? Number(item?.position) : 0,
  };
}

async function ownsCollection(userId: string, collectionId: string) {
  const { rows } = await socialQuery("select 1 from user_collections where id = $1 and user_id = $2", [collectionId, userId]);
  return rows.length > 0;
}

/** Daftar item dalam koleksi. */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(request);
    const { id } = await props.params;
    if (!UUID.test(id)) return NextResponse.json({ error: "id tidak valid." }, { status: 400 });

    const sort = new URL(request.url).searchParams.get("sort") || "newest";
    const orderBy =
      sort === "updated"
        ? "latest_chapter_at desc nulls last, created_at desc"
        : sort === "oldest"
          ? "created_at asc"
          : "created_at desc";

    const { rows } = await socialQuery(
      `select collection_id, source, slug, title, image, position, created_at, latest_chapter_at
         from user_collection_items
        where collection_id = $1 and user_id = $2
        order by ${orderBy}`,
      [id, userId],
    );
    return NextResponse.json({ items: rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal memuat item koleksi." }, { status: 500 });
  }
}

/** Tambah satu atau banyak item sekaligus. */
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(request);
    const { id } = await props.params;
    if (!UUID.test(id)) return NextResponse.json({ error: "id tidak valid." }, { status: 400 });
    if (!(await ownsCollection(userId, id))) return NextResponse.json({ error: "Koleksi tidak ditemukan." }, { status: 404 });

    const body = (await request.json().catch(() => null)) as { items?: unknown; item?: unknown } | null;
    const raw = Array.isArray(body?.items) ? body.items : body?.item ? [body.item] : [];
    const items = (raw as IncomingItem[]).map(normalize).filter((item) => item.slug).slice(0, 500);
    if (!items.length) return NextResponse.json({ error: "Item kosong." }, { status: 400 });

    await socialQuery(
      `insert into user_collection_items (collection_id, user_id, source, slug, title, image, position)
       select $1, $2, * from unnest($3::text[], $4::text[], $5::text[], $6::text[], $7::int[])`,
      [
        id,
        userId,
        items.map((item) => item.source),
        items.map((item) => item.slug),
        items.map((item) => item.title),
        items.map((item) => item.image),
        items.map((item) => item.position),
      ],
    );
    // Tanggal update seri diambil best-effort (cache 1 jam). Kegagalan fetch
    // tidak boleh menggagalkan penambahan item — kolomnya cuma untuk sorting.
    const { getSeriesMeta } = await import("@/lib/seriesMeta");
    await Promise.all(
      items.slice(0, 20).map(async (item) => {
        try {
          const meta = await getSeriesMeta(item.source || "komiku", item.slug);
          if (meta.latestChapterAt) {
            await socialQuery(
              "update user_collection_items set latest_chapter_at = $1 where collection_id = $2 and user_id = $3 and slug = $4",
              [meta.latestChapterAt, id, userId, item.slug],
            );
          }
        } catch {
          // biarkan null
        }
      }),
    );

    await socialQuery("update user_collections set updated_at = now() where id = $1", [id]);

    return NextResponse.json({ success: true, added: items.length });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal menambah item." }, { status: 500 });
  }
}

/** Hapus item dari koleksi: ?slug=...&source=... */
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(request);
    const { id } = await props.params;
    if (!UUID.test(id)) return NextResponse.json({ error: "id tidak valid." }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const slug = (searchParams.get("slug") || "").trim();
    const source = (searchParams.get("source") || "").trim();
    if (!slug) return NextResponse.json({ error: "slug wajib." }, { status: 400 });

    await socialQuery(
      `delete from user_collection_items
        where collection_id = $1 and user_id = $2 and slug = $3
          and ($4 = '' or source = $4)`,
      [id, userId, slug, source],
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal menghapus item." }, { status: 500 });
  }
}
