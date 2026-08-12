import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request); const userId = await requireUserId(request);
    if (!socialLimit(request, userId, 10)) return socialJson({ error: "Batas laporan tercapai." }, { status: 429 });
    const body = await request.json() as { targetType?: string; targetId?: string; reason?: string };
    const reason = body.reason?.trim().slice(0, 200);
    if (!body.targetId || !["post", "profile"].includes(body.targetType || "") || !reason || reason.length < 3) return socialJson({ error: "Laporan tidak lengkap." }, { status: 400 });
    const { error } = await supabaseAdmin.from("social_reports").upsert({ reporter_id: userId, target_type: body.targetType, target_id: body.targetId, reason, status: "open" }, { onConflict: "reporter_id,target_type,target_id" });
    if (error) throw error; return socialJson({ success: true }, { status: 201 });
  } catch (error) { return socialError(error); }
}
