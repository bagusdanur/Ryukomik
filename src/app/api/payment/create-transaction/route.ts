import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getVerifiedUserId } from "@/lib/serverRoleCache";

const PROJECT_SLUG = process.env.PAYMENT_GATEWAY_PROJECT_SLUG;
const API_KEY = process.env.PAYMENT_GATEWAY_API_KEY;
const API_URL = "https://app.pakasir.com/api/transactioncreate";

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });
    }

    let userId: string;
    try {
      userId = await getVerifiedUserId(token);
    } catch {
      return NextResponse.json({ error: "Sesi login tidak valid." }, { status: 401 });
    }

    const { package_name, duration_days, amount, payment_method } = await request.json();

    if (!package_name || !duration_days || !amount || !payment_method) {
      return NextResponse.json({ error: "Data paket tidak lengkap." }, { status: 400 });
    }

    if (!PROJECT_SLUG || !API_KEY) {
      return NextResponse.json({ error: "Konfigurasi payment gateway belum disetup." }, { status: 500 });
    }

    // Generate unique order ID
    const order_id = `RYU-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Call payment gateway API
    const response = await fetch(`${API_URL}/${payment_method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project: PROJECT_SLUG,
        order_id,
        amount,
        api_key: API_KEY,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.payment) {
      console.error("Payment API Error:", data);
      return NextResponse.json({ error: "Gagal membuat transaksi di payment gateway." }, { status: 500 });
    }

    const payment = data.payment;

    // Save to database
    const { error: dbError } = await supabaseAdmin
      .from("payment_transactions")
      .insert({
        user_id: userId,
        order_id,
        package_name,
        duration_days,
        amount,
        fee: payment.fee,
        total_payment: payment.total_payment,
        payment_method: payment.payment_method,
        payment_number: payment.payment_number,
        status: "pending",
        expired_at: payment.expired_at,
      });

    if (dbError) {
      console.error("DB Error:", dbError);
      return NextResponse.json({ error: "Gagal menyimpan transaksi." }, { status: 500 });
    }

    return NextResponse.json({ success: true, payment: payment });
  } catch (error) {
    console.error("Create Transaction Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
