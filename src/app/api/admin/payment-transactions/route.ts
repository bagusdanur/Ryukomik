import { NextResponse } from "next/server";
import { adminErrorResponse, privateAdminJson, verifyAdminRequest } from "@/lib/adminApi";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const url = new URL(request.url);
    const filter = url.searchParams.get("filter") || "all";

    let query = supabaseAdmin
      .from("payment_transactions")
      .select(`
        *,
        profiles (
          username,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return privateAdminJson({ transactions: data || [] });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memuat data transaksi otomatis");
  }
}
