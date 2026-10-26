import { NextResponse } from "next/server";
import { adminErrorResponse, privateAdminJson, verifyAdminRequest } from "@/lib/adminApi";
import { socialQuery } from "@/lib/social/db";

const PER_PAGE = 20;

/** Daftar komentar untuk tab Moderasi — dibaca dari Postgres lokal. */
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

    const conditions: string[] = [];
    const values: unknown[] = [];
    if (filter === "spoiler") conditions.push("is_spoiler = true");
    if (search) {
      values.push(`%${search}%`);
      conditions.push(`content ilike $${values.length}`);
    }
    const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

    const offset = (page - 1) * PER_PAGE;
    values.push(PER_PAGE, offset);

    const [{ rows }, total] = await Promise.all([
      socialQuery(
        `select id, content, slug, chapter, author_name, avatar_url, created_at, is_spoiler,
                user_id, parent_id, edited_at, deleted_at
           from comments
           ${where}
          order by created_at desc
          limit $${values.length - 1} offset $${values.length}`,
        values,
      ),
      socialQuery<{ n: number }>(`select count(*)::int n from comments ${where}`, values.slice(0, values.length - 2)),
    ]);

    return privateAdminJson({
      comments: rows.map((row: Record<string, unknown>) => ({
        ...row,
        id: Number(row.id),
        parent_id: row.parent_id === null ? null : Number(row.parent_id),
      })),
      total: total.rows[0]?.n || 0,
    });
  } catch (error) {
    return adminErrorResponse(error, "Gagal memuat komentar.");
  }
}
