import { NextResponse } from "next/server";
import { rollbackAdsConfig } from "@/lib/adsSettings";
import { verifyAdminRequest } from "@/lib/adminApi";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const restored = await rollbackAdsConfig(admin.userId);

    return NextResponse.json({
      ...restored,
      message: "Konfigurasi sebelumnya berhasil dipulihkan.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memulihkan konfigurasi.";
    const status = message.includes("Tidak ada konfigurasi") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
