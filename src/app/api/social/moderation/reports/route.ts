import { assertSameOrigin } from "@/lib/social/auth";
import { socialError, socialJson, socialLimit } from "@/lib/social/http";
import { requireModerator } from "@/lib/social/moderator";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  try {
    const moderator = await requireModerator(request);
    if (!socialLimit(request, moderator.userId, 60)) return socialJson({ error: "Terlalu banyak permintaan." }, { status: 429 });
    const status = new URL(request.url).searchParams.get("status") || "open";
    let query = supabaseAdmin.from("social_reports").select("id, reporter_id, target_type, target_id, reason, status, moderator_id, moderator_note, resolved_at, created_at").order("created_at", { ascending: false }).limit(50);
    if (status !== "all") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return socialJson({ items: data || [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return socialJson({ error: "Akses moderator diperlukan." }, { status: 403 });
    return socialError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const moderator = await requireModerator(request);
    const body = await request.json() as { id?: number; status?: string; note?: string; removeTarget?: boolean };
    if (!body.id || !["reviewed", "dismissed", "actioned"].includes(body.status || "")) return socialJson({ error: "Keputusan moderasi tidak valid." }, { status: 400 });
    const { data: report, error: reportError } = await supabaseAdmin.from("social_reports").select("id, target_type, target_id").eq("id", body.id).maybeSingle();
    if (reportError) throw reportError;
    if (!report) return socialJson({ error: "Laporan tidak ditemukan." }, { status: 404 });
    if (body.removeTarget && report.target_type === "post") await supabaseAdmin.from("social_posts").delete().eq("id", report.target_id);
    const { error } = await supabaseAdmin.from("social_reports").update({ status: body.status, moderator_id: moderator.userId, moderator_note: body.note?.trim().slice(0, 500) || null, resolved_at: new Date().toISOString() }).eq("id", body.id);
    if (error) throw error;
    return socialJson({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return socialJson({ error: "Akses moderator diperlukan." }, { status: 403 });
    return socialError(error);
  }
}
