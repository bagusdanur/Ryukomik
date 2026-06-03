import { NextResponse } from "next/server";
import { getApkSettings, setApkSettings } from "@/lib/apkSettings";
import { verifyAdminRequest } from "@/lib/adminApi";

function parseChangelog(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const settings = await getApkSettings();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = await request.json().catch(() => ({}));
    const downloadUrl = String(body?.downloadUrl || "").trim();
    const version = String(body?.version || "").trim().replace(/^v/i, "");
    const changelog = parseChangelog(body?.changelog);
    const enabled = body?.enabled !== false;

    if (!downloadUrl) {
      return NextResponse.json({ error: "URL download wajib diisi." }, { status: 400 });
    }

    try {
      const parsedUrl = new URL(downloadUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return NextResponse.json(
          { error: "URL harus menggunakan http atau https." },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json({ error: "Format URL download tidak valid." }, { status: 400 });
    }

    if (!version) {
      return NextResponse.json({ error: "Versi APK wajib diisi." }, { status: 400 });
    }

    if (!changelog.length) {
      return NextResponse.json(
        { error: "Log update wajib diisi minimal satu baris." },
        { status: 400 },
      );
    }

    const settings = await setApkSettings({
      downloadUrl,
      version,
      changelog,
      enabled,
    });

    return NextResponse.json({
      ...settings,
      message: "Setting APK berhasil disimpan.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan setting APK." },
      { status: 500 },
    );
  }
}
