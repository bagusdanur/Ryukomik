import { NextResponse } from "next/server";
import { adminErrorResponse, privateAdminJson, verifyAdminRequest } from "@/lib/adminApi";
import { socialQuery } from "@/lib/social/db";

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

    const { rows } = await socialQuery(
      `select id::text as id, actor_id, actor_name, event_type, entity_id, entity_label, created_at
         from activity_events
        where event_type like 'admin.%'
        order by created_at desc
        limit $1`,
      [limit],
    );
    return privateAdminJson({ entries: rows });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memuat audit log.");
  }
}
