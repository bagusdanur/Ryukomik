import { NextResponse } from "next/server";
import { adminErrorResponse, privateAdminJson, verifyAdminRequest } from "@/lib/adminApi";
import { normalizePremiumDays } from "@/lib/requestAuthPolicy";
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

// Code generation used to run in the browser via supabase.rpc(), which meant
// the RPC/table had to stay writable for anonymous clients. Keep it server-side
// so the table can be locked down.
export async function POST(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { days?: number; prefix?: string };
    const days = normalizePremiumDays(body.days);
    const prefix = String(body.prefix || "RYUKO").replace(/[^A-Za-z0-9]/g, "").slice(0, 12) || "RYUKO";

    const { data, error } = await supabaseAdmin.rpc("generate_premium_code", {
      p_duration_days: days,
      p_prefix: prefix,
    });

    if (error) throw error;
    return privateAdminJson({ success: true, result: data });
  } catch (error) {
    return adminErrorResponse(error, "Gagal membuat kode premium.");
  }
}

export async function DELETE(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const body = (await request.json()) as { id?: string };
    if (!body?.id) {
      return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("premium_codes").delete().eq("id", body.id);
    if (error) throw error;
    return privateAdminJson({ success: true, id: body.id });
  } catch (error) {
    return adminErrorResponse(error, "Gagal menghapus kode premium.");
  }
}
