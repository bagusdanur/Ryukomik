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
      .select("id, user_id, amount, currency, status, payment_method, reference, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data: transactions, error } = await query;
    if (error) throw error;
    
    let mergedTransactions = [];
    if (transactions && transactions.length > 0) {
      const userIds = Array.from(new Set(transactions.map((t: any) => t.user_id)));
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);
      
      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));
      mergedTransactions = transactions.map((t: any) => ({
        ...t,
        profiles: profileMap.get(t.user_id) || null
      }));
    }

    return privateAdminJson({ transactions: mergedTransactions });
  } catch (error: any) {
    console.error("Error fetching payment transactions:", error);
    return adminErrorResponse(error, error?.message || "Gagal memuat data transaksi otomatis");
  }
}
