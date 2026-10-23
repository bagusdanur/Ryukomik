import { NextResponse } from "next/server";
import { adminErrorResponse, privateAdminJson, verifyAdminRequest } from "@/lib/adminApi";
import { computePremiumUntil, normalizePremiumDays } from "@/lib/requestAuthPolicy";
import { banUntilFrom, canBanTarget, normalizeBanDays } from "@/lib/banPolicy";
import { recordAdminAction } from "@/lib/adminAudit";
import { supabaseAdmin } from "@/lib/supabaseServer";
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

    const BASE_COLUMNS =
      "id, username, avatar_url, is_premium, level, xp, role, created_at, premium_until";
    const BAN_COLUMNS = "is_banned, banned_until, ban_reason";

    const buildQuery = (columns: string, allowBanFilter: boolean) => {
      let query = supabaseAdmin
        .from("profiles")
        .select(columns, { count: "exact" })
        .order("created_at", { ascending: false });

      if (filter === "premium") query = query.eq("is_premium", true);
      if (filter === "reguler") query = query.eq("is_premium", false);
      if (filter === "staff") query = query.eq("role", "staff");
      if (filter === "admin") query = query.eq("role", "admin");
      if (filter === "banned" && allowBanFilter) query = query.eq("is_banned", true);
      if (search) query = query.ilike("username", `%${search}%`);

      return query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    };

    let result = await buildQuery(`${BASE_COLUMNS}, ${BAN_COLUMNS}`, true);
    if (result.error) {
      // Ban columns not migrated yet — keep the dashboard working.
      result = await buildQuery(BASE_COLUMNS, false);
    }

    const { data, count, error } = result;

    if (error) throw error;
    return privateAdminJson({ users: data || [], total: count || 0 });
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
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            is_banned: false,
            banned_until: null,
            ban_reason: null,
            banned_at: null,
            banned_by: null,
          })
          .eq("id", userId);
        if (error) throw error;

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

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          is_banned: true,
          banned_until: bannedUntil,
          ban_reason: reasonText,
          banned_at: new Date().toISOString(),
          banned_by: admin.userId,
        })
        .eq("id", userId);
      if (error) throw error;

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
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ is_premium: false, premium_until: null })
          .eq("id", userId);
        if (error) throw error;
        revalidateTag("public-profile", { expire: 0 });
        await recordAdminAction({ actorId: admin.userId, action: "premium_remove", targetId: userId });
        return privateAdminJson({ success: true, userId, isPremium: false });
      }

      const safeDays = normalizePremiumDays(days);
      const { data: current, error: readError } = await supabaseAdmin
        .from("profiles")
        .select("premium_until")
        .eq("id", userId)
        .maybeSingle();
      if (readError) throw readError;

      const premiumUntil = computePremiumUntil(
        (current as { premium_until?: string | null } | null)?.premium_until ?? null,
        safeDays,
      );

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_premium: true, premium_until: premiumUntil })
        .eq("id", userId);
      if (error) throw error;

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

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ role: normalizedRole })
      .eq("id", userId);

    if (error) throw error;

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
