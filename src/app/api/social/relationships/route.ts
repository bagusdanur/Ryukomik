import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson } from "@/lib/social/http";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const kind = new URL(request.url).searchParams.get("kind") === "block" ? "block" : "mute";
    const table = kind === "block" ? "user_blocks" : "user_mutes";
    const ownerColumn = kind === "block" ? "blocker_id" : "user_id";
    const targetColumn = kind === "block" ? "blocked_id" : "muted_id";
    const { data, error } = await supabaseAdmin.from(table).select(`${targetColumn}, created_at`).eq(ownerColumn, userId).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    const rows = (data || []) as unknown as Array<Record<string, string>>;
    const ids = rows.map((row) => row[targetColumn]);
    const { data: profiles, error: profilesError } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, username, avatar_url, bio").in("id", ids)
      : { data: [], error: null };
    if (profilesError) throw profilesError;
    const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));
    return socialJson({ items: ids.map((id) => byId.get(id)).filter(Boolean) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return socialError(error); }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireUserId(request);
    const { kind, targetUserId } = await request.json() as { kind?: "block" | "mute"; targetUserId?: string };
    if (!targetUserId || !["block", "mute"].includes(kind || "")) return socialJson({ error: "Relasi tidak valid." }, { status: 400 });
    const table = kind === "block" ? "user_blocks" : "user_mutes";
    const ownerColumn = kind === "block" ? "blocker_id" : "user_id";
    const targetColumn = kind === "block" ? "blocked_id" : "muted_id";
    const { error } = await supabaseAdmin.from(table).delete().eq(ownerColumn, userId).eq(targetColumn, targetUserId);
    if (error) throw error;
    return socialJson({ success: true });
  } catch (error) { return socialError(error); }
}
