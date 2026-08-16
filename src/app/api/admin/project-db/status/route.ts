import { NextResponse } from "next/server";
import { projectApiFetch } from "@/lib/projectApiServer";
import { adminErrorResponse, verifyAdminRequest } from "@/lib/adminApi";
export async function GET(request: Request) { try { const admin = await verifyAdminRequest(request); if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status }); return NextResponse.json(await projectApiFetch("/admin/status"), { headers: { "Cache-Control": "private, max-age=30" } }); } catch (e) { return adminErrorResponse(e, "PostgreSQL project belum tersedia."); } }
