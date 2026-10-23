import { NextResponse } from "next/server";
import { adminErrorResponse, privateAdminJson, verifyAdminRequest } from "@/lib/adminApi";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

/** Recent privileged actions. Rows live in activity_events with visibility=private. */
export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const url = new URL(request.url);
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 50)));

    const { data, error } = await supabaseAdmin
      .from("activity_events")
      .select("id, actor_id, actor_name, event_type, entity_id, entity_label, created_at")
      .like("event_type", "admin.%")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return privateAdminJson({ entries: data || [] });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memuat audit log.");
  }
}
