import { NextResponse } from "next/server";
import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { socialQuery, socialTransaction } from "@/lib/social/db";
import { ensureSocialProfile } from "@/lib/social/profileSync";

const FREE_DAILY_LIMIT = 5;

type AccessRow = { is_premium: boolean; role: string | null };
type QuotaRow = { used: number; reserved: number };

function quotaPayload(access: AccessRow, quota: QuotaRow) {
  const unlimited = access.is_premium || access.role === "admin";
  const used = Number(quota.used || 0);
  const reserved = Number(quota.reserved || 0);
  return {
    unlimited,
    limit: unlimited ? null : FREE_DAILY_LIMIT,
    used,
    reserved,
    remaining: unlimited ? null : Math.max(0, FREE_DAILY_LIMIT - used - reserved),
    resetTimezone: "Asia/Jakarta",
  };
}

async function accessFor(userId: string) {
  await ensureSocialProfile(userId);
  const result = await socialQuery<AccessRow>(
    "select is_premium,role from social_profiles where user_id=$1",
    [userId],
  );
  return result.rows[0] || { is_premium: false, role: null };
}

async function quotaFor(userId: string) {
  const result = await socialQuery<QuotaRow>(
    `select
       count(*) filter (where status='completed')::int used,
       count(*) filter (where status='reserved' and expires_at>now())::int reserved
     from download_quota_reservations
     where user_id=$1 and usage_date=(now() at time zone 'Asia/Jakarta')::date`,
    [userId],
  );
  return result.rows[0] || { used: 0, reserved: 0 };
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "private, no-store", ...init?.headers },
  });
}

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const access = await accessFor(userId);
    return json({ quota: quotaPayload(access, await quotaFor(userId)) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return json({ error: "Login diperlukan." }, { status: 401 });
    }
    console.error("[download-quota:get]", error);
    return json({ error: "Gagal memuat kuota download." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await requireUserId(request);
    const body = (await request.json()) as { action?: string; reservationId?: string };
    const access = await accessFor(userId);

    if (access.is_premium || access.role === "admin") {
      return json({ quota: quotaPayload(access, { used: 0, reserved: 0 }), reservationId: null });
    }

    if (body.action === "start") {
      const result = await socialTransaction(async (client) => {
        const dayResult = await client.query<{ day: string }>(
          "select (now() at time zone 'Asia/Jakarta')::date::text day",
        );
        const day = dayResult.rows[0].day;
        await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`download:${userId}:${day}`]);
        await client.query(
          "update download_quota_reservations set status='cancelled',updated_at=now() where user_id=$1 and usage_date=$2::date and status='reserved' and expires_at<=now()",
          [userId, day],
        );
        const count = await client.query<QuotaRow>(
          `select
             count(*) filter (where status='completed')::int used,
             count(*) filter (where status='reserved' and expires_at>now())::int reserved
           from download_quota_reservations where user_id=$1 and usage_date=$2::date`,
          [userId, day],
        );
        const current = count.rows[0] || { used: 0, reserved: 0 };
        if (Number(current.used) + Number(current.reserved) >= FREE_DAILY_LIMIT) return null;
        const inserted = await client.query<{ id: string }>(
          `insert into download_quota_reservations(user_id,usage_date,expires_at)
           values($1,$2::date,now()+interval '15 minutes') returning id`,
          [userId, day],
        );
        return inserted.rows[0]?.id || null;
      });
      if (!result) {
        return json({ error: "Kuota download gratis hari ini sudah habis.", quota: quotaPayload(access, await quotaFor(userId)) }, { status: 429 });
      }
      return json({ reservationId: result, quota: quotaPayload(access, await quotaFor(userId)) });
    }

    if (!body.reservationId || !["complete", "cancel"].includes(body.action || "")) {
      return json({ error: "Permintaan kuota tidak valid." }, { status: 400 });
    }

    const status = body.action === "complete" ? "completed" : "cancelled";
    const updated = await socialQuery<{ id: string }>(
      `update download_quota_reservations set status=$3,updated_at=now()
       where id=$1 and user_id=$2 and status='reserved' and expires_at>now() returning id`,
      [body.reservationId, userId, status],
    );
    if (!updated.rows[0]) return json({ error: "Reservasi download sudah tidak berlaku." }, { status: 409 });
    return json({ success: true, quota: quotaPayload(access, await quotaFor(userId)) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return json({ error: "Login diperlukan." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "BAD_ORIGIN") {
      return json({ error: "Origin tidak valid." }, { status: 403 });
    }
    console.error("[download-quota:post]", error);
    return json({ error: "Gagal memproses kuota download." }, { status: 500 });
  }
}
