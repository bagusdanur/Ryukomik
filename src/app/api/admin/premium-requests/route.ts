import { NextResponse } from "next/server";
import { adminErrorResponse, privateAdminJson, verifyAdminRequest } from "@/lib/adminApi";
import { approvePremiumRequest, listPremiumRequests, rejectPremiumRequest } from "@/lib/social/moneyStore";
import { bumpProfileSignal } from "@/lib/social/profileSignals";
import { updateLocalProfile } from "@/lib/social/profileWrite";
import { createSocialNotification } from "@/lib/social/notifications";
import { sendPremiumActivatedPush } from "@/lib/premiumPush";

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const url = new URL(request.url);
    const filter = url.searchParams.get("filter") || "all";
    return privateAdminJson({ requests: await listPremiumRequests(filter, 50) });
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
      const rejected = await rejectPremiumRequest(String(body.id));
      if (!rejected) return NextResponse.json({ error: "Permintaan sudah diproses." }, { status: 409 });
      return privateAdminJson({ success: true, status: "rejected" });
    }

    let result: ApprovalResult | null = null;
    try {
      result = (await approvePremiumRequest(String(body.id))) as ApprovalResult;
    } catch (approveError) {
      const message = approveError instanceof Error ? approveError.message : "Gagal menyetujui.";
      return NextResponse.json({ error: message }, { status: message.includes("sudah diproses") ? 409 : 400 });
    }
    if (!result?.user_id || !result.premium_until) {
      throw new Error("Hasil aktivasi premium tidak valid.");
    }
    await bumpProfileSignal(result.user_id);
    await updateLocalProfile(
      result.user_id,
      { is_premium: true, premium_until: result.premium_until },
      "premium-requests/approve",
    );

    const notification = createSocialNotification({
      userId: result.user_id,
      actorName: `Admin · Premium +${result.duration_days} Hari`,
      type: "premium_activated",
      slug: body.id,
      targetId: body.id,
    });
    const push = sendPremiumActivatedPush(result.user_id, body.id);
    await Promise.allSettled([notification, push]);

    return privateAdminJson({ success: true, status: "approved", ...result });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memproses permintaan premium.");
  }
}
