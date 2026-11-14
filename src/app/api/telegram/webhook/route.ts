import { NextResponse } from "next/server";

import { approvePremiumRequest, rejectPremiumRequest } from "@/lib/social/moneyStore";
import { updateLocalProfile } from "@/lib/social/profileWrite";
import { bumpProfileSignal } from "@/lib/social/profileSignals";
import { createSocialNotification } from "@/lib/social/notifications";
import { sendPremiumActivatedPush } from "@/lib/premiumPush";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CallbackQuery = {
  id: string;
  from?: { id?: number };
  data?: string;
  message?: { message_id?: number; chat?: { id?: number }; caption?: string };
};

function api(method: string) {
  const token = process.env.TELEGRAM_PREMIUM_BOT_TOKEN || "";
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function callTelegram(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_PREMIUM_BOT_TOKEN || "";
  if (!token) return null;
  const response = await fetch(api(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  }).catch(() => null);
  return response?.ok ? response.json().catch(() => null) : null;
}

function adminIds(): string[] {
  return (process.env.TELEGRAM_PREMIUM_ADMIN_IDS || process.env.TELEGRAM_PREMIUM_CHAT_ID || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Webhook Telegram untuk tombol ACC / Tolak pada notifikasi premium.
 *
 * Keamanan: Telegram mengirim header `X-Telegram-Bot-Api-Secret-Token` yang
 * harus sama dengan TELEGRAM_WEBHOOK_SECRET, dan tombol hanya diproses kalau
 * pengirimnya ada di daftar admin.
 */
export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as { callback_query?: CallbackQuery } | null;
  const query = update?.callback_query;
  if (!query?.id || !query.data) return NextResponse.json({ ok: true });

  const fromId = String(query.from?.id ?? "");
  if (!adminIds().includes(fromId)) {
    await callTelegram("answerCallbackQuery", { callback_query_id: query.id, text: "Kamu tidak berhak." });
    return NextResponse.json({ ok: true });
  }

  const [prefix, action, requestId] = query.data.split(":");
  if (prefix !== "prem" || !requestId || (action !== "approve" && action !== "reject")) {
    await callTelegram("answerCallbackQuery", { callback_query_id: query.id, text: "Aksi tidak dikenal." });
    return NextResponse.json({ ok: true });
  }

  let note = "";
  try {
    if (action === "approve") {
      const result = await approvePremiumRequest(requestId);
      if (!result?.user_id || !result.premium_until) throw new Error("Hasil aktivasi premium tidak valid.");
      await bumpProfileSignal(result.user_id);
      await updateLocalProfile(
        result.user_id,
        { is_premium: true, premium_until: result.premium_until },
        "telegram/approve",
      );
      const notification = createSocialNotification({
        userId: result.user_id,
        actorName: "Admin · Premium diaktifkan",
        type: "premium_activated",
        slug: requestId,
        targetId: requestId,
      });
      const push = sendPremiumActivatedPush(result.user_id, requestId);
      await Promise.allSettled([notification, push]);
      note = "\n\n✅ Disetujui lewat Telegram";
    } else {
      const rejected = await rejectPremiumRequest(requestId);
      if (!rejected) throw new Error("Permintaan sudah diproses.");
      note = "\n\n❌ Ditolak lewat Telegram";
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses.";
    await callTelegram("answerCallbackQuery", { callback_query_id: query.id, text: message.slice(0, 180) });
    return NextResponse.json({ ok: true });
  }

  await callTelegram("answerCallbackQuery", { callback_query_id: query.id, text: action === "approve" ? "Premium disetujui." : "Permintaan ditolak." });

  const chatId = query.message?.chat?.id;
  const messageId = query.message?.message_id;
  if (chatId && messageId) {
    const caption = `${query.message?.caption || ""}${note}`.slice(0, 1000);
    await callTelegram("editMessageCaption", {
      chat_id: chatId,
      message_id: messageId,
      caption,
      reply_markup: {
        inline_keyboard: [[{ text: "Buka Dashboard Premium", url: "https://ryukomik.com/dashboard?page=requests" }]],
      },
    });
  }

  return NextResponse.json({ ok: true });
}
