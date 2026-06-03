import { NextResponse } from "next/server";
import { adminErrorResponse, privateAdminJson, verifyAdminRequest } from "@/lib/adminApi";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("premium_codes")
      .select("id, code, used, duration_days, created_at, used_at, used_by")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return privateAdminJson({ codes: data || [] });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memuat kode premium.");
  }
}
