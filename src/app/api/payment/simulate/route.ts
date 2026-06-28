import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

const PROJECT_SLUG = process.env.PAYMENT_GATEWAY_PROJECT_SLUG;
const API_KEY = process.env.PAYMENT_GATEWAY_API_KEY;
const API_URL = "https://app.pakasir.com/api/paymentsimulation";

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Sesi login tidak valid." }, { status: 401 });
    }

    const { order_id } = await request.json();

    if (!order_id) {
      return NextResponse.json({ error: "order_id diperlukan" }, { status: 400 });
    }

    if (!PROJECT_SLUG || !API_KEY) {
      return NextResponse.json({ error: "Konfigurasi payment gateway belum disetup." }, { status: 500 });
    }

    // Get amount from order
    const { data: tx, error: txError } = await supabaseAdmin
      .from("payment_transactions")
      .select("amount")
      .eq("order_id", order_id)
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (txError || !tx) {
      return NextResponse.json({ error: "Transaksi tidak valid." }, { status: 404 });
    }

    // Call simulation API
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project: PROJECT_SLUG,
        order_id,
        amount: tx.amount,
        api_key: API_KEY,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Simulation API Error:", data);
      return NextResponse.json({ error: "Simulasi gagal." }, { status: 500 });
    }

    // LOCALHOST FIX: Pakasir server cannot send webhook to our localhost.
    // So we manually trigger our own local webhook logic here to update DB.
    if (request.url.includes("localhost")) {
      const baseUrl = request.url.split("/api/payment/simulate")[0];
      try {
        await fetch(`${baseUrl}/api/payment/webhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: order_id,
            amount: tx.amount,
            project: PROJECT_SLUG,
            status: "completed",
            payment_method: "sandbox",
            completed_at: new Date().toISOString()
          })
        });
      } catch (e) {
        console.error("Local webhook simulation failed:", e);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Simulation Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
