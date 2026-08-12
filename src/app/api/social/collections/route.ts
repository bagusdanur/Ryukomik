import { revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const { data, error } = await supabaseAdmin.from("user_collections")
      .select("id, name, description, cover_url, items_count, visibility, is_public, created_at, updated_at")
      .eq("user_id", userId).order("updated_at", { ascending: false }).limit(20);
    if (error) throw error;
    return socialJson({ items: data || [] }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) { return socialError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireUserId(request);
    if (!socialLimit(request, userId, 10)) return socialJson({ error: "Terlalu banyak permintaan." }, { status: 429 });
    const body = await request.json() as { name?: string; description?: string; cover_url?: string; visibility?: string };
    const name = body.name?.trim().slice(0, 80);
    const visibility = ["public", "private", "unlisted"].includes(body.visibility || "") ? body.visibility! : "public";
    if (!name) return socialJson({ error: "Nama koleksi diperlukan." }, { status: 400 });
    const { data, error } = await supabaseAdmin.from("user_collections").insert({
      user_id: userId, name, description: body.description?.trim().slice(0, 240) || null,
      cover_url: body.cover_url?.trim().slice(0, 2048) || null, visibility, is_public: visibility === "public",
    }).select("id").single();
    if (error) throw error;
    const { data: actor } = await supabaseAdmin.from("profiles").select("username").eq("id", userId).maybeSingle();
    await supabaseAdmin.from("activity_events").insert({ actor_id: userId, actor_name: actor?.username || "User", event_type: "created_collection", entity_id: data.id, entity_label: name, visibility: visibility === "private" ? "private" : "public" });
    revalidateTag("public-profile", { expire: 0 }); revalidateTag("social-profile", { expire: 0 });
    return socialJson({ id: data.id }, { status: 201 });
  } catch (error) { return socialError(error); }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request); const userId = await requireUserId(request);
    const body = await request.json() as { id?: string; name?: string; description?: string; cover_url?: string; visibility?: string };
    if (!body.id) return socialJson({ error: "ID diperlukan." }, { status: 400 });
    const changes: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) changes.name = body.name.trim().slice(0, 80);
    if (body.description !== undefined) changes.description = body.description.trim().slice(0, 240) || null;
    if (body.cover_url !== undefined) {
      const cover = body.cover_url.trim();
      if (cover && (!cover.startsWith("https://") || cover.length > 2048)) return socialJson({ error: "Cover wajib URL HTTPS." }, { status: 400 });
      changes.cover_url = cover || null;
    }
    if (body.visibility && ["public", "private", "unlisted"].includes(body.visibility)) {
      changes.visibility = body.visibility; changes.is_public = body.visibility === "public";
    }
    const { error } = await supabaseAdmin.from("user_collections").update(changes).eq("id", body.id).eq("user_id", userId);
    if (error) throw error;
    revalidateTag("public-profile", { expire: 0 }); revalidateTag("social-profile", { expire: 0 });
    return socialJson({ success: true });
  } catch (error) { return socialError(error); }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request); const userId = await requireUserId(request);
    const { id } = await request.json() as { id?: string };
    if (!id) return socialJson({ error: "ID diperlukan." }, { status: 400 });
    const { error } = await supabaseAdmin.from("user_collections").delete().eq("id", id).eq("user_id", userId);
    if (error) throw error;
    revalidateTag("public-profile", { expire: 0 }); revalidateTag("social-profile", { expire: 0 });
    return socialJson({ success: true });
  } catch (error) { return socialError(error); }
}
