import { NextResponse } from "next/server";
import { getYukiAiSettings, setYukiAiSettings } from "@/lib/yukiAiSettings";
import { verifyAdminRequest } from "@/lib/adminApi";

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const settings = await getYukiAiSettings();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = await request.json().catch(() => ({}));
    const enabled = body?.enabled !== false;

    const settings = await setYukiAiSettings(enabled);

    return NextResponse.json({
      ...settings,
      message: "Setting Yuki AI berhasil disimpan.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan setting Yuki AI." },
      { status: 500 },
    );
  }
}
