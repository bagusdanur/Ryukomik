import { NextResponse } from "next/server";
import {
  getAdsConfig,
  setAdsConfig,
  validateAdsConfig,
} from "@/lib/adsSettings";
import { verifyAdminRequest } from "@/lib/adminApi";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const config = await getAdsConfig();
  const response = NextResponse.json(config);
  response.headers.set("Cache-Control", "private, max-age=0");
  return response;
}

export async function PUT(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = await request.json().catch(() => ({}));
    const result = validateAdsConfig({
      masterEnabled: body?.masterEnabled,
      validationMode: body?.validationMode,
      allowedHosts: body?.allowedHosts,
      providers: body?.providers,
    });

    if (result.ok === false) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const saved = await setAdsConfig(result.config, admin.userId);

    return NextResponse.json({
      ...saved,
      newHosts: result.newHosts,
      message: "Konfigurasi iklan berhasil disimpan.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan konfigurasi iklan." },
      { status: 500 },
    );
  }
}
