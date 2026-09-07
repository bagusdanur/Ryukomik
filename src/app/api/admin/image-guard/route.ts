import { NextResponse } from "next/server";
import { adminErrorResponse, verifyAdminRequest } from "@/lib/adminApi";

const CONTROL_URL = "https://storage.ryukomik.my.id/__ryukomik/image-guard";

async function guardRequest(method: "GET" | "PUT", enabled?: boolean) {
  const token = process.env.IMAGE_ACCESS_SECRET;
  if (!token) throw new Error("Token kontrol anti-hotlink belum dikonfigurasi.");
  const response = await fetch(CONTROL_URL, {
    method,
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: method === "PUT" ? JSON.stringify({ enabled }) : undefined,
  });
  if (!response.ok) throw new Error(`Kontrol anti-hotlink gagal (${response.status}).`);
  return response.json() as Promise<{ enabled: boolean }>;
}

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });
    return NextResponse.json(await guardRequest("GET"), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return adminErrorResponse(error, "Gagal membaca status anti-hotlink.");
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });
    const body = await request.json().catch(() => null) as { enabled?: unknown } | null;
    if (typeof body?.enabled !== "boolean") return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
    return NextResponse.json(await guardRequest("PUT", body.enabled), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return adminErrorResponse(error, "Gagal mengubah status anti-hotlink.");
  }
}
