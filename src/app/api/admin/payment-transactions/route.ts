import { NextResponse } from "next/server";
import { adminErrorResponse, privateAdminJson, verifyAdminRequest } from "@/lib/adminApi";
import { listPaymentTransactions } from "@/lib/social/moneyStore";
import { getSocialProfiles } from "@/lib/social/profileLookup";

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const url = new URL(request.url);
    const filter = url.searchParams.get("filter") || "all";

    let transactions = await listPaymentTransactions(100);
    if (filter !== "all") {
      transactions = transactions.filter((row) => (row as { status?: string }).status === filter);
    }
    
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
