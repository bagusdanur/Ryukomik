import { NextResponse } from "next/server";
import { adminErrorResponse, privateAdminJson, verifyAdminRequest } from "@/lib/adminApi";
import { supabaseAdmin } from "@/lib/supabaseServer";

const PER_PAGE = 20;

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
      .select("id, username, avatar_url, is_premium, level, xp, created_at, premium_until", {
        count: "exact",
      })
      .order("created_at", { ascending: false });

    if (filter === "premium") query = query.eq("is_premium", true);
    if (filter === "reguler") query = query.eq("is_premium", false);
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
