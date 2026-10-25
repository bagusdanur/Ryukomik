import { NextResponse } from "next/server";
import { adminErrorResponse, privateAdminJson, verifyAdminRequest } from "@/lib/adminApi";
import { recordAdminAction } from "@/lib/adminAudit";
import { grantPremiumDays } from "@/lib/adminPremium";
import { createSocialNotification } from "@/lib/social/notifications";
import {
  finalizeCompletedPeriods,
  getActiveEvent,
  getWinner,
  invalidateMarathonEventCache,
  listWinners,
  setWinnerStatus,
  updateEvent,
} from "@/lib/marathon/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const [event, winners] = await Promise.all([getActiveEvent(), listWinners(60)]);
    return privateAdminJson({ event, winners });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memuat event marathon.");
  }
}

export async function PATCH(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const body = (await request.json()) as { eventId?: string } & Record<string, unknown>;
    const eventId = body.eventId || (await getActiveEvent())?.id;
    if (!eventId) {
      return NextResponse.json({ error: "Tidak ada event aktif." }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (typeof body.title === "string") patch.title = body.title.trim().slice(0, 120);
    if (typeof body.description === "string") patch.description = body.description.trim().slice(0, 500);
    if (typeof body.starts_at === "string" && Number.isFinite(Date.parse(body.starts_at))) patch.starts_at = body.starts_at;
    if (body.ends_at === null) patch.ends_at = null;
    if (typeof body.ends_at === "string" && Number.isFinite(Date.parse(body.ends_at))) patch.ends_at = body.ends_at;
    if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
    for (const key of ["prize_1", "prize_2", "prize_3"] as const) {
      if (typeof body[key] === "string") patch[key] = (body[key] as string).trim().slice(0, 160);
    }
    // Hadiah per periode: array 3 angka (juara 1..3) dalam hari premium.
    for (const key of ["weekly_days", "monthly_days"] as const) {
      const value = body[key];
      if (!Array.isArray(value)) continue;
      const days = value.slice(0, 3).map((entry) => {
        const n = Math.floor(Number(entry));
        return Number.isFinite(n) && n >= 0 ? Math.min(n, 3650) : 0;
      });
      while (days.length < 3) days.push(0);
      patch[key] = days;
    }
    for (const key of ["premium_days_1", "premium_days_2", "premium_days_3", "daily_chapter_cap"] as const) {
      if (body[key] !== undefined) {
        const n = Math.floor(Number(body[key]));
        if (Number.isFinite(n) && n >= 0) patch[key] = Math.min(n, 3650);
      }
    }

    const updated = await updateEvent(String(eventId), patch);
    invalidateMarathonEventCache();

    await recordAdminAction({
      actorId: admin.userId,
      action: "marathon_config",
      targetId: String(eventId),
      detail: Object.keys(patch).join(",") || "noop",
    });

    return privateAdminJson({ success: true, event: updated });
  } catch (error) {
    return adminErrorResponse(error, "Gagal menyimpan konfigurasi event.");
  }
}

export async function POST(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const body = (await request.json()) as { action?: string; winnerId?: string };

    if (body.action === "finalize") {
      const result = await finalizeCompletedPeriods();
      await recordAdminAction({
        actorId: admin.userId,
        action: "marathon_config",
        detail: `finalize weekly=${result.weekly.winners.length} monthly=${result.monthly.winners.length}`,
      });
      return privateAdminJson({ success: true, ...result });
    }

    if (!body.winnerId) {
      return NextResponse.json({ error: "winnerId wajib diisi." }, { status: 400 });
    }

    const winner = await getWinner(body.winnerId);
    if (!winner) {
      return NextResponse.json({ error: "Pemenang tidak ditemukan." }, { status: 404 });
    }

    if (body.action === "void") {
      const updated = await setWinnerStatus(body.winnerId, "void");
      await recordAdminAction({
        actorId: admin.userId,
        action: "marathon_grant",
        targetId: String(winner.user_id),
        detail: `void rank ${winner.rank} ${winner.period_type} ${winner.period_key}`,
      });
      return privateAdminJson({ success: true, winner: updated });
    }

    if (body.action !== "grant") {
      return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
    }

    if (winner.status === "granted") {
      return NextResponse.json({ error: "Hadiah sudah pernah diberikan." }, { status: 409 });
    }

    const premiumUntil = await grantPremiumDays(String(winner.user_id), Number(winner.premium_days) || 0);
    const updated = await setWinnerStatus(body.winnerId, "granted", admin.userId);

    // Kabari pemenangnya (in-app + push lewat panel notifikasi yang sudah ada).
    try {
      await createSocialNotification({
        userId: String(winner.user_id),
        actorName: "Speedrun",
        type: "premium_reward",
        slug: "/marathon",
        targetId: String(winner.id),
      });
    } catch (notifyError) {
      console.error("[marathon] notify winner failed:", notifyError instanceof Error ? notifyError.message : notifyError);
    }

    await recordAdminAction({
      actorId: admin.userId,
      action: "marathon_grant",
      targetId: String(winner.user_id),
      detail: `rank ${winner.rank} ${winner.period_type} ${winner.period_key} +${winner.premium_days}d`,
    });

    return privateAdminJson({ success: true, premiumUntil, winner: updated });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memproses hadiah.");
  }
}
