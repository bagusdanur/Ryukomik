import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/social/auth";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const { data, error } = await supabaseAdmin.from("premium_requests")
      .select("id, status, updated_at").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ request: data || null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json(
      { error: unauthorized ? "Login diperlukan." : "Gagal memeriksa status premium." },
      { status: unauthorized ? 401 : 500 },
    );
  }
}
