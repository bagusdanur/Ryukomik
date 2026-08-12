import { revalidateTag } from "next/cache";
import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { supabaseAdmin } from "@/lib/supabaseServer";

const PROFILE_FIELDS = "id, username, avatar_url, banner_url, bio, level, show_public_reads, show_public_comments, show_public_join_date";

function mediaUrl(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("INVALID_MEDIA");
  const trimmed = value.trim();
  if (trimmed.length > 2048 || !trimmed.startsWith("https://")) throw new Error("INVALID_MEDIA");
  const url = new URL(trimmed);
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname)) throw new Error("INVALID_MEDIA");
  return trimmed;
}

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const { data, error } = await supabaseAdmin.from("profiles").select(PROFILE_FIELDS).eq("id", userId).maybeSingle();
    if (error) throw error;
    return socialJson({ profile: data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return socialError(error); }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request); const userId = await requireUserId(request);
    if (!socialLimit(request, userId, 10)) return socialJson({ error: "Terlalu banyak perubahan." }, { status: 429 });
    const body = await request.json() as Record<string, unknown>;
    const changes = {
      bio: typeof body.bio === "string" ? body.bio.trim().slice(0, 280) || null : null,
      avatar_url: mediaUrl(body.avatar_url), banner_url: mediaUrl(body.banner_url),
      show_public_reads: body.show_public_reads !== false,
      show_public_comments: body.show_public_comments !== false,
      show_public_join_date: body.show_public_join_date !== false,
    };
    const { error } = await supabaseAdmin.from("profiles").update(changes).eq("id", userId);
    if (error) throw error;
    revalidateTag("public-profile", { expire: 0 }); revalidateTag("social-profile", { expire: 0 });
    return socialJson({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_MEDIA") return socialJson({ error: "Avatar dan banner wajib berupa URL HTTPS publik." }, { status: 400 });
    return socialError(error);
  }
}
