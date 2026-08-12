import { revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson } from "@/lib/social/http";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(request); const { id } = await context.params;
    const cursor = new URL(request.url).searchParams.get("cursor");
    let query = supabaseAdmin.from("user_collection_items")
      .select("collection_id, source, slug, title, image, position, created_at")
      .eq("collection_id", id).eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(21);
    if (cursor) query = query.lt("created_at", cursor);
    const { data, error } = await query; if (error) throw error;
    const rows = data || []; const items = rows.slice(0, 20);
    return socialJson({ items, nextCursor: rows.length > 20 ? items.at(-1)?.created_at : null }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) { return socialError(error); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request); const userId = await requireUserId(request); const { id } = await context.params;
    const item = await request.json() as { source?: string; slug?: string; title?: string; image?: string; position?: number };
    if (!item.slug) return socialJson({ error: "Slug diperlukan." }, { status: 400 });
    const image = item.image?.trim() || null;
    if (image && (!image.startsWith("https://") || image.length > 2048)) return socialJson({ error: "URL gambar harus HTTPS." }, { status: 400 });
    const { data: collection } = await supabaseAdmin.from("user_collections").select("id").eq("id", id).eq("user_id", userId).maybeSingle();
    if (!collection) return socialJson({ error: "Koleksi tidak ditemukan." }, { status: 404 });
    const { error } = await supabaseAdmin.from("user_collection_items").insert({ collection_id: id, user_id: userId, source: item.source || "komiku", slug: item.slug.slice(0, 500), title: item.title?.slice(0, 200) || "Unknown", image, position: item.position || 0 });
    if (error) throw error;
    await supabaseAdmin.from("user_collections").update({ updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
    revalidateTag("public-profile", { expire: 0 });
    return socialJson({ success: true }, { status: 201 });
  } catch (error) { return socialError(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request); const userId = await requireUserId(request); const { id } = await context.params;
    const item = await request.json() as { source?: string; slug?: string };
    if (!item.slug) return socialJson({ error: "Slug diperlukan." }, { status: 400 });
    const { error } = await supabaseAdmin.from("user_collection_items").delete().eq("collection_id", id).eq("user_id", userId).eq("source", item.source || "komiku").eq("slug", item.slug);
    if (error) throw error;
    revalidateTag("public-profile", { expire: 0 });
    return socialJson({ success: true });
  } catch (error) { return socialError(error); }
}
