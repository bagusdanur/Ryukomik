import { NextResponse } from "next/server";
import { adminErrorResponse, privateAdminJson, verifyAdminRequest } from "@/lib/adminApi";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getSocialProfiles } from "@/lib/social/profileLookup";

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
      .select("id, user_id, order_id, package_name, duration_days, amount, fee, total_payment, payment_method, payment_number, status, expired_at, completed_at, created_at")
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
      // Profil dari database lokal (nol egress Supabase).
      const localProfiles = await getSocialProfiles(userIds as string[]);
      const profileMap = new Map(
        [...localProfiles.entries()].map(([id, person]) => [
          id,
          { id, username: person.username, avatar_url: person.avatar_url },
        ]),
      );
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
