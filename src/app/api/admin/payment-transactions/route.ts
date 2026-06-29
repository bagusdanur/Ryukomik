import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 401 });
    }

    // Verify token & role
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
    }

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (!roleData || roleData.role !== "admin") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";

    // Build query for payment_transactions joined with profiles
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

    const { data: transactions, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ transactions });
  } catch (err) {
    console.error("Error fetching payment transactions:", err);
    return NextResponse.json({ error: "Gagal mengambil data transaksi otomatis" }, { status: 500 });
  }
}
