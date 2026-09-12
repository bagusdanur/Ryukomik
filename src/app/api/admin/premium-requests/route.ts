import { NextResponse } from "next/server";
import { adminErrorResponse, privateAdminJson, verifyAdminRequest } from "@/lib/adminApi";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { createSocialNotification } from "@/lib/social/notifications";

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const url = new URL(request.url);
    const filter = url.searchParams.get("filter") || "all";
    let query = supabaseAdmin
      .from("premium_requests")
      .select("id, user_id, status, name, proof_url, package_name, duration_days, amount, sk_agreed, sk_agreed_at, created_at, profiles(username, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter !== "all") query = query.eq("status", filter);

    const { data, error } = await query;
    if (error) throw error;
    return privateAdminJson({ requests: data || [] });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memuat request premium.");
  }
}

type ApprovalResult = {
  user_id: string;
  duration_days: number;
  previous_until: string | null;
  premium_until: string;
};

export async function POST(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const body = await request.json() as { id?: string; action?: "approve" | "reject" };
    if (!body.id || !["approve", "reject"].includes(body.action || "")) {
      return NextResponse.json({ error: "Aksi permintaan premium tidak valid." }, { status: 400 });
    }

    if (body.action === "reject") {
      const { data, error } = await supabaseAdmin
        .from("premium_requests")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", body.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Permintaan sudah diproses." }, { status: 409 });
      return privateAdminJson({ success: true, status: "rejected" });
    }

    const { data, error } = await supabaseAdmin.rpc("approve_manual_premium_request", {
      p_request_id: body.id,
    });
    if (error) {
      const status = error.message.includes("sudah diproses") ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    const result = (Array.isArray(data) ? data[0] : data) as ApprovalResult | null;
    if (!result?.user_id || !result.premium_until) {
      throw new Error("Hasil aktivasi premium tidak valid.");
    }

    await createSocialNotification({
      userId: result.user_id,
      actorName: `Admin · Premium +${result.duration_days} Hari`,
      type: "premium_activated",
      slug: body.id,
      targetId: body.id,
    });

    return privateAdminJson({ success: true, status: "approved", ...result });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memproses permintaan premium.");
  }
}
