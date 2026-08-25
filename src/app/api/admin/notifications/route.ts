import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminApi";
import { createSocialNotification, type SocialNotificationType } from "@/lib/social/notifications";

const ADMIN_NOTIFICATION_TYPES = new Set<SocialNotificationType>([
  "premium_activated",
  "premium_reward",
]);

export async function POST(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const body = await request.json() as {
      userId?: string;
      actorName?: string;
      type?: SocialNotificationType;
      slug?: string | null;
      targetId?: string | null;
    };
    if (!body.userId || !body.type || !ADMIN_NOTIFICATION_TYPES.has(body.type)) {
      return NextResponse.json({ error: "Notifikasi admin tidak valid." }, { status: 400 });
    }

    await createSocialNotification({
      userId: body.userId,
      actorName: body.actorName || "Admin",
      type: body.type,
      slug: body.slug,
      targetId: body.targetId,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat notifikasi." },
      { status: 500 },
    );
  }
}
