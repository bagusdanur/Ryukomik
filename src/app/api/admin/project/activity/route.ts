import { NextResponse } from "next/server";
import { verifyAdminRequest, adminErrorResponse } from "@/lib/adminApi";
import { projectApiFetch } from "@/lib/projectApiServer";

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });
    return NextResponse.json(await projectApiFetch("/admin/activity?limit=20"));
  } catch (error) {
    return adminErrorResponse(error, "Gagal memuat aktivitas project.");
  }
}
