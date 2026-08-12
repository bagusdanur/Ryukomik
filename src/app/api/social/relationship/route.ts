import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { supabaseAdmin } from "@/lib/supabaseServer";

type Kind = "block" | "mute";
const config = {
  block: { table: "user_blocks", owner: "blocker_id", target: "blocked_id" },
  mute: { table: "user_mutes", owner: "user_id", target: "muted_id" },
} as const;

async function mutate(request: Request, remove: boolean) {
  assertSameOrigin(request); const userId = await requireUserId(request);
  if (!socialLimit(request, userId, 20)) return socialJson({ error: "Terlalu banyak permintaan." }, { status: 429 });
  const body = await request.json() as { targetUserId?: string; kind?: Kind };
  if (!body.targetUserId || body.targetUserId === userId || !body.kind || !config[body.kind]) return socialJson({ error: "Relasi tidak valid." }, { status: 400 });
  const selected = config[body.kind];
  const query = remove
    ? supabaseAdmin.from(selected.table).delete().eq(selected.owner, userId).eq(selected.target, body.targetUserId)
    : supabaseAdmin.from(selected.table).upsert({ [selected.owner]: userId, [selected.target]: body.targetUserId }, { ignoreDuplicates: true });
  const { error } = await query; if (error) throw error;
  if (body.kind === "block" && !remove) await supabaseAdmin.from("user_follows").delete().or(`and(follower_id.eq.${userId},following_id.eq.${body.targetUserId}),and(follower_id.eq.${body.targetUserId},following_id.eq.${userId})`);
  return socialJson({ active: !remove });
}

export async function POST(request: Request) { try { return await mutate(request, false); } catch (error) { return socialError(error); } }
export async function DELETE(request: Request) { try { return await mutate(request, true); } catch (error) { return socialError(error); } }
