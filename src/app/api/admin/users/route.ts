import { NextResponse } from "next/server";
import { adminErrorResponse, privateAdminJson, verifyAdminRequest } from "@/lib/adminApi";
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

    let query = supabaseAdmin
      .from("profiles")
      .select("id, username, avatar_url, is_premium, level, xp, role, created_at, premium_until", {
        count: "exact",
      })
      .order("created_at", { ascending: false });

    if (filter === "premium") query = query.eq("is_premium", true);
    if (filter === "reguler") query = query.eq("is_premium", false);
    if (filter === "staff") query = query.eq("role", "staff");
    if (filter === "admin") query = query.eq("role", "admin");
    if (search) query = query.ilike("username", `%${search}%`);

    const { data, count, error } = await query.range(
      (page - 1) * PER_PAGE,
      page * PER_PAGE - 1,
    );

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
    const { userId, role } = body as { userId?: string; role?: string | null };

    if (!userId) {
      return NextResponse.json({ error: "userId wajib diisi." }, { status: 400 });
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

    return privateAdminJson({ success: true, userId, role: normalizedRole ?? "member" });
  } catch (error) {
    return adminErrorResponse(error, "Gagal mengubah role.");
  }
}
