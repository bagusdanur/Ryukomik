import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, order_id, project, status, payment_method, completed_at } = body;

    // Log the incoming webhook
    console.log("Received Webhook:", body);

    if (status !== "completed") {
      return NextResponse.json({ success: true, message: "Ignored non-completed status." });
    }

    if (!order_id) {
      return NextResponse.json({ error: "order_id missing" }, { status: 400 });
    }

    // Verify transaction exists and get details
    const { data: tx, error: txError } = await supabaseAdmin
      .from("payment_transactions")
      .select("id, user_id, amount, duration_days, status")
      .eq("order_id", order_id)
      .maybeSingle();

    if (txError || !tx) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    // If already completed, just return ok
    if (tx.status === "completed") {
      return NextResponse.json({ success: true, message: "Already completed" });
    }

    // Verify amount matches our database
    if (tx.amount !== amount) {
      console.warn(`Amount mismatch for order ${order_id}: expected ${tx.amount}, got ${amount}`);
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // SECURITY: Validate transaction directly to Pakasir API to prevent spoofing
    const PROJECT_SLUG = process.env.PAYMENT_GATEWAY_PROJECT_SLUG;
    const API_KEY = process.env.PAYMENT_GATEWAY_API_KEY;
    
    if (PROJECT_SLUG && API_KEY && payment_method !== "sandbox") {
      try {
        const verifyUrl = `https://app.pakasir.com/api/transactiondetail?project=${PROJECT_SLUG}&amount=${amount}&order_id=${order_id}&api_key=${API_KEY}`;
        const verifyRes = await fetch(verifyUrl);
        const verifyData = await verifyRes.json();
        
        if (!verifyRes.ok || verifyData.transaction?.status !== "completed") {
          console.error("Spoofed webhook detected or transaction not completed on provider side:", verifyData);
          return NextResponse.json({ error: "Transaction verification failed" }, { status: 403 });
        }
      } catch (err) {
        console.error("Failed to verify transaction with provider:", err);
        return NextResponse.json({ error: "Verification error" }, { status: 500 });
      }
    }

    // Update transaction status
    const { error: updateError } = await supabaseAdmin
      .from("payment_transactions")
      .update({
        status: "completed",
        completed_at: completed_at || new Date().toISOString(),
      })
      .eq("order_id", order_id);

    if (updateError) {
      throw updateError;
    }

    // Activate premium for user
    // Get current profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("premium_until")
      .eq("id", tx.user_id)
      .maybeSingle();

    let newPremiumUntil = new Date();
    if (profile?.premium_until && new Date(profile.premium_until) > new Date()) {
      newPremiumUntil = new Date(profile.premium_until);
    }
    
    // Add duration_days
    newPremiumUntil.setDate(newPremiumUntil.getDate() + tx.duration_days);

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        is_premium: true,
        premium_until: newPremiumUntil.toISOString(),
      })
      .eq("id", tx.user_id);

    if (profileError) {
      console.error("Failed to update profile:", profileError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
