import { NextResponse } from "next/server";
import { projectApiUrl } from "@/lib/projectApiServer";
import { adminErrorResponse, verifyAdminRequest } from "@/lib/adminApi";

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });
    const url = projectApiUrl("/admin/backups/latest");
    if (!url) return NextResponse.json({ error: "Project API belum dikonfigurasi" }, { status: 503 });
    const upstream = await fetch(url, { headers: { Authorization: `Bearer ${process.env.PROJECT_API_INTERNAL_TOKEN || ""}` }, cache: "no-store" });
    if (!upstream.ok) return NextResponse.json({ error: "Backup belum tersedia" }, { status: upstream.status });
    return new NextResponse(upstream.body, { headers: { "Content-Type": "application/octet-stream", "Content-Disposition": upstream.headers.get("content-disposition") || 'attachment; filename="ryukomik_project.dump"', "Cache-Control": "no-store" } });
  } catch (error) { return adminErrorResponse(error, "Gagal mengunduh backup."); }
}
