import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/social/authResponse";
import { requireUserId } from "@/lib/social/auth";
import { socialQuery } from "@/lib/social/db";
import { isReservedHandle } from "@/lib/scanlatorReserved";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HANDLE_RE = /^[a-z0-9][a-z0-9-]{2,29}$/;

function textOf(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validSample(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v || v.length > 2000) return false;
  if (v.startsWith("https://")) {
    try {
      const url = new URL(v);
      return !["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname);
    } catch {
      return false;
    }
  }
  return v.length >= 10;
}

/** Nomor WA: hanya digit, 9–15 angka. */
function phoneOf(value: unknown): string | null {
  const v = typeof value === "string" ? value.replace(/[^\d+]/g, "") : "";
  const digits = v.replace(/\+/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  return digits;
}

/** Telegram/Discord: username tanpa spasi, 2–40 karakter. */
function usernameOf(value: unknown): string | null {
  const v = typeof value === "string" ? value.trim().replace(/^@/, "") : "";
  if (!/^[A-Za-z0-9._-]{2,40}$/.test(v)) return null;
  return v;
}

/**
 * Apply Request Akun Translation (Scanlator). Wajib kontak WA/Telegram/Discord
 * supaya admin bisa menghubungi tim untuk review & pembinaan.
 */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    const handle = textOf(body?.handle, 30).toLowerCase();
    const teamName = textOf(body?.team_name, 80);
    const description = textOf(body?.description, 1000);
    const samples = Array.isArray(body?.samples) ? body.samples.filter(validSample).slice(0, 3) : [];
    const agreeTerms = body?.agree_terms === true;

    const wa = phoneOf(body?.contact_wa);
    const telegram = usernameOf(body?.contact_telegram);
    const discord = usernameOf(body?.contact_discord);

    if (!HANDLE_RE.test(handle)) {
      return NextResponse.json({ error: "Handle harus 3–30 karakter: huruf kecil, angka, dan strip." }, { status: 400 });
    }
    if (isReservedHandle(handle)) {
      return NextResponse.json(
        { error: "Handle ini dilindungi. Pakai nama lain, mis. tambahkan nama timmu sendiri." },
        { status: 400 },
      );
    }
    if (teamName.length < 2) return NextResponse.json({ error: "Nama tim wajib diisi." }, { status: 400 });
    if (samples.length === 0) return NextResponse.json({ error: "Sertakan minimal 1 contoh hasil TL." }, { status: 400 });
    if (!agreeTerms) return NextResponse.json({ error: "Kamu wajib menyetujui Syarat & Ketentuan Scanlator." }, { status: 400 });
    if (!discord) {
      return NextResponse.json({ error: "Isi username Discord kamu (wajib, untuk dihubungi admin)." }, { status: 400 });
    }

    const me = await socialQuery<{ role: string | null }>("select role from social_profiles where user_id = $1", [userId]);
    if (me.rows[0]?.role === "scanlator") {
      return NextResponse.json({ error: "Akun kamu sudah Scanlator aktif." }, { status: 409 });
    }

    const existing = await socialQuery<{ status: string }>(
      "select status from scanlator_applications where user_id = $1 and status in ('pending','approved') limit 1",
      [userId],
    );
    if (existing.rows[0]) {
      return NextResponse.json(
        { error: existing.rows[0].status === "approved" ? "Pengajuanmu sudah disetujui." : "Pengajuanmu sedang menunggu review admin." },
        { status: 409 },
      );
    }

    // Hanya pengajuan yang masih hidup yang mengunci handle. Tim yang sudah
    // dihapus/dicabut tidak boleh menghalangi pemiliknya mengajukan ulang.
    const handleTaken = await socialQuery<{ id: string }>(
      "select id::text as id from scanlator_applications where handle = $1 and status in ('pending','approved') limit 1",
      [handle],
    );
    if (handleTaken.rows[0]) {
      return NextResponse.json({ error: "Handle sudah dipakai tim lain." }, { status: 409 });
    }

    const { rows } = await socialQuery<{ id: string }>(
      `insert into scanlator_applications (user_id, handle, team_name, description, samples, agree_terms, contact_wa, contact_telegram, contact_discord)
       values ($1, $2, $3, $4, $5, true, $6, $7, $8) returning id::text as id`,
      [userId, handle, teamName, description || null, samples, wa, telegram, discord],
    );

    void notifyScanlatorApplication(handle, teamName, wa, telegram, discord).catch(() => undefined);

    return NextResponse.json({ success: true, id: rows[0].id, status: "pending" });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error("[scanlator/apply] gagal:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Gagal mengajukan. Coba lagi." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const { rows } = await socialQuery<{
      id: string; handle: string; team_name: string; status: string; review_note: string | null; created_at: string;
    }>(
      `select id::text as id, handle, team_name, status, review_note, created_at
         from scanlator_applications where user_id = $1 order by created_at desc limit 1`,
      [userId],
    );
    return NextResponse.json({ success: true, application: rows[0] || null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Gagal memuat status pengajuan." }, { status: 500 });
  }
}

async function notifyScanlatorApplication(handle: string, teamName: string, wa: string | null, telegram: string | null, discord: string | null) {
  const botToken = process.env.TELEGRAM_PREMIUM_BOT_TOKEN || "";
  const target = process.env.TELEGRAM_PREMIUM_CHAT_ID || "";
  if (!botToken || !target) return;
  const contacts = [
    discord ? `Discord: ${discord}` : "",
    telegram ? `Telegram: @${telegram}` : "",
    wa ? `WA: ${wa}` : "",
  ].filter(Boolean).join("\n");
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: target,
      text: `Pengajuan Scanlator baru (BETA)\n\nTim: ${teamName}\nHandle: ${handle}\n\nKontak:\n${contacts}\n\nCek dashboard admin → tab Scanlator.`,
      reply_markup: { inline_keyboard: [[{ text: "Buka Dashboard Scanlator", url: "https://ryukomik.my.id/dashboard?page=scanlator" }]] },
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => undefined);
}
