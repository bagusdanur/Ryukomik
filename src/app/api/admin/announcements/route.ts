import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminApi";
import { socialQuery } from "@/lib/social/db";

type Audience = "all" | "free" | "premium";

function normalizeLink(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("LINK_INVALID");
  const link = value.trim();
  if (!link.startsWith("/") || link.startsWith("//") || link.length > 500) {
    throw new Error("LINK_INVALID");
  }
  return link;
}

function normalizeDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error("DATE_INVALID");
  return new Date(value).toISOString();
}

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });
  try {
    const result = await socialQuery(
      `select a.id,a.title,a.message,a.link,a.audience,a.is_active,a.published_at,a.expires_at,
              a.created_at,count(r.user_id)::int as read_count
       from social_announcements a
       left join social_announcement_reads r on r.announcement_id=a.id
       group by a.id order by a.created_at desc limit 50`,
    );
    return NextResponse.json({ items: result.rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memuat pengumuman." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });
  try {
    const body = await request.json() as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const audience: Audience = body.audience === "free" || body.audience === "premium" ? body.audience : "all";
    const link = normalizeLink(body.link);
    const expiresAt = normalizeDate(body.expiresAt);
    if (!title || title.length > 120 || !message || message.length > 500) {
      return NextResponse.json({ error: "Judul atau isi pengumuman tidak valid." }, { status: 400 });
    }
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: "Waktu kedaluwarsa harus setelah waktu sekarang." }, { status: 400 });
    }
    const result = await socialQuery(
      `insert into social_announcements(title,message,link,audience,expires_at,created_by)
       values($1,$2,$3,$4,$5,$6) returning *`,
      [title, message, link, audience, expiresAt, admin.userId],
    );
    return NextResponse.json({ success: true, item: result.rows[0] }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message === "LINK_INVALID"
      ? "Link harus berupa path internal, misalnya /premium."
      : error instanceof Error && error.message === "DATE_INVALID"
        ? "Format waktu kedaluwarsa tidak valid."
        : "Gagal membuat pengumuman.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });
  try {
    const body = await request.json() as { id?: string; isActive?: boolean };
    if (!body.id || typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "Perubahan pengumuman tidak valid." }, { status: 400 });
    }
    const result = await socialQuery(
      `update social_announcements set is_active=$2,updated_at=now() where id=$1 returning id,is_active`,
      [body.id, body.isActive],
    );
    if (!result.rowCount) return NextResponse.json({ error: "Pengumuman tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ success: true, item: result.rows[0] });
  } catch {
    return NextResponse.json({ error: "Gagal mengubah pengumuman." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });
  try {
    const body = await request.json() as { id?: string };
    if (!body.id) return NextResponse.json({ error: "ID pengumuman diperlukan." }, { status: 400 });
    const result = await socialQuery("delete from social_announcements where id=$1 returning id", [body.id]);
    if (!result.rowCount) return NextResponse.json({ error: "Pengumuman tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus pengumuman." }, { status: 500 });
  }
}
