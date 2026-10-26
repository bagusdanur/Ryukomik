import { NextResponse } from "next/server";
import { adminErrorResponse, privateAdminJson, verifyAdminRequest } from "@/lib/adminApi";
import { computePremiumUntil, normalizePremiumDays } from "@/lib/requestAuthPolicy";
import { banUntilFrom, canBanTarget, normalizeBanDays } from "@/lib/banPolicy";
import { recordAdminAction } from "@/lib/adminAudit";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { bumpProfileSignal } from "@/lib/social/profileSignals";
import { updateLocalProfile } from "@/lib/social/profileWrite";
import { socialQuery } from "@/lib/social/db";
import { revalidateTag } from "next/cache";

const PER_PAGE = 20;
const VALID_ROLES = new Set([null, "staff", "admin"]);

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const filter = url.searchParams.get("filter") || "all";
    const search = url.searchParams.get("search")?.trim() || "";

    // Sumber lokal (social_profiles): daftar admin tidak lagi membaca tabel
    // profiles Supabase. Kolom ban sudah tersedia di lokal (irisan 0).
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter === "premium") conditions.push("is_premium = true");
    if (filter === "reguler") conditions.push("is_premium = false");
    if (filter === "staff") conditions.push("role = 'staff'");
    if (filter === "admin") conditions.push("role = 'admin'");
    if (filter === "banned") conditions.push("is_banned = true");
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`username ilike $${params.length}`);
    }

    const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
    params.push(PER_PAGE, (page - 1) * PER_PAGE);

    const { rows } = await socialQuery<Record<string, unknown> & { total: string }>(
      `select user_id as id, username, avatar_url, is_premium, level, xp, role,
              created_at, premium_until, is_banned, banned_until, ban_reason,
              count(*) over() as total
         from social_profiles
         ${where}
        order by created_at desc
        limit $${params.length - 1} offset $${params.length}`,
      params,
    );

    const total = Number(rows[0]?.total || 0);
    const users = rows.map(({ total: _ignored, ...rest }) => ({ ...rest, id: rest.id }));
    return privateAdminJson({ users, total });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memuat user.");
  }
}

export async function PATCH(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const body = await request.json();
    const { userId, role, action, days, reason } = body as {
      userId?: string;
      role?: string | null;
      action?: "premium" | "premium-remove" | "ban" | "unban";
      days?: number | null;
      reason?: string;
    };

    if (!userId) {
      return NextResponse.json({ error: "userId wajib diisi." }, { status: 400 });
    }

    // ── ban / unban ───────────────────────────────────────────────────────
    if (action === "ban" || action === "unban") {
      if (!canBanTarget(admin.userId, userId)) {
        return NextResponse.json({ error: "Tidak bisa memblokir akun sendiri." }, { status: 400 });
      }

      if (action === "unban") {
        await updateLocalProfile(userId, {
          is_banned: false,
          banned_until: null,
          ban_reason: null,
          banned_at: null,
          banned_by: null,
        }, "admin/users");
        await bumpProfileSignal(userId);

        // Lift the Supabase Auth ban so the account can sign in again.
        try {
          await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "none" });
        } catch {
          // Auth record may be gone; the profile flag is already cleared.
        }

        revalidateTag("profile-role", { expire: 0 });
        await recordAdminAction({ actorId: admin.userId, action: "unban", targetId: userId });
        return privateAdminJson({ success: true, userId, isBanned: false });
      }

      const banDays = normalizeBanDays(days);
      const bannedUntil = banUntilFrom(banDays);
      const reasonText = String(reason || "").trim().slice(0, 300) || null;

      await updateLocalProfile(userId, {
        is_banned: true,
        banned_until: bannedUntil,
        ban_reason: reasonText,
        banned_at: new Date().toISOString(),
        banned_by: admin.userId,
      }, "admin/users");
      await bumpProfileSignal(userId);

      // Block sign-in and token refresh at the auth layer as well.
      try {
        const hours = banDays === null ? 876000 : banDays * 24;
        await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: `${hours}h` });
      } catch {
        // The profile flag still blocks every API call; auth ban is a bonus.
      }

      revalidateTag("profile-role", { expire: 0 });
      await recordAdminAction({
        actorId: admin.userId,
        action: "ban",
        targetId: userId,
        detail: `${banDays === null ? "permanen" : `${banDays} hari`}${reasonText ? ` — ${reasonText}` : ""}`,
      });

      return privateAdminJson({
        success: true,
        userId,
        isBanned: true,
        bannedUntil,
        permanent: banDays === null,
      });
    }

    // ── premium ───────────────────────────────────────────────────────────
    // Premium mutations live on the server so the browser never needs blanket
    // UPDATE rights on `profiles` (that permissive policy was the breach).
    if (action === "premium" || action === "premium-remove") {
      if (action === "premium-remove") {
        await updateLocalProfile(userId, { is_premium: false, premium_until: null }, "admin/users");
        await bumpProfileSignal(userId);
        revalidateTag("public-profile", { expire: 0 });
        await recordAdminAction({ actorId: admin.userId, action: "premium_remove", targetId: userId });
        return privateAdminJson({ success: true, userId, isPremium: false });
      }

      const safeDays = normalizePremiumDays(days);
      // Premium dibaca & ditulis dari database lokal (sumber tunggal, irisan 2).
      const { rows: localRows } = await socialQuery<{ premium_until: string | null }>(
        "select premium_until from social_profiles where user_id = $1",
        [userId],
      );
      const premiumUntil = computePremiumUntil(localRows[0]?.premium_until ?? null, safeDays);

      await updateLocalProfile(userId, { is_premium: true, premium_until: premiumUntil }, "admin/users");
      await bumpProfileSignal(userId);

      revalidateTag("public-profile", { expire: 0 });
      await recordAdminAction({
        actorId: admin.userId,
        action: "premium_grant",
        targetId: userId,
        detail: `${safeDays} hari`,
      });
      return privateAdminJson({ success: true, userId, isPremium: true, days: safeDays, premiumUntil });
    }

    // An admin must not be able to demote themselves (lockout) .
    if (admin.userId === userId) {
      return NextResponse.json({ error: "Tidak bisa mengubah role akun sendiri." }, { status: 400 });
    }

    const normalizedRole = role === "member" ? null : role ?? null;
    if (!VALID_ROLES.has(normalizedRole)) {
      return NextResponse.json(
        { error: `Role tidak valid. Gunakan: member, staff, admin` },
        { status: 400 },
      );
    }

    await updateLocalProfile(userId, { role: normalizedRole }, "admin/users");
    await bumpProfileSignal(userId);

    revalidateTag("profile-role", { expire: 0 });
    revalidateTag("public-profile", { expire: 0 });

    await recordAdminAction({
      actorId: admin.userId,
      action: "role_change",
      targetId: userId,
      detail: normalizedRole ?? "member",
    });

    return privateAdminJson({ success: true, userId, role: normalizedRole ?? "member" });
  } catch (error) {
    return adminErrorResponse(error, "Gagal mengubah role.");
  }
}
