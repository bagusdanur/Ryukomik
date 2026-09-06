import { NextResponse } from "next/server";
import { projectApiFetch } from "@/lib/projectApiServer";
import { adminErrorResponse, verifyAdminRequest } from "@/lib/adminApi";

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });
    return NextResponse.json(await projectApiFetch("/admin/stats", { cache: "no-store" }), {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memuat statistik Project.");
  }
}
