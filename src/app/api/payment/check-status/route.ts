import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const order_id = searchParams.get("order_id");

    if (!order_id) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Sesi login tidak valid." }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("payment_transactions")
      .select("status, completed_at")
      .eq("order_id", order_id)
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, status: data.status, completed_at: data.completed_at });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
