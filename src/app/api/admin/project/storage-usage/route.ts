import { NextResponse } from "next/server";
import { adminErrorResponse, privateAdminJson, verifyAdminRequest } from "@/lib/adminApi";
import { getR2Usage, R2_FREE_LIMIT_BYTES } from "@/lib/r2Storage";

/**
 * Pemakaian R2 untuk Project (gambar chapter/cover).
 *
 * Kuota gratis R2 = 10 GB-month penyimpanan. Endpoint ini mengembalikan
 * terpakai, sisa, dan persentase supaya admin tahu kapan mendekati batas.
 * `?refresh=1` memaksa hitung ulang (default cache 10 menit).
 */
export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const force = new URL(request.url).searchParams.get("refresh") === "1";
    const usage = await getR2Usage(force);
    const limitBytes = R2_FREE_LIMIT_BYTES;
    const freeBytes = Math.max(0, limitBytes - usage.usedBytes);

    return privateAdminJson({
      bucket: usage.buckets.map((b) => b.bucket).join(", "),
      usedBytes: usage.usedBytes,
      freeBytes,
      limitBytes,
      objectCount: usage.objectCount,
      percentUsed: limitBytes > 0 ? Math.min(100, (usage.usedBytes / limitBytes) * 100) : 0,
      buckets: usage.buckets.map((b) => ({
        id: b.id,
        bucket: b.bucket,
        publicBase: b.publicBase,
        usedBytes: b.usedBytes,
        objectCount: b.objectCount,
        freeBytes: Math.max(0, limitBytes - b.usedBytes),
        percentUsed: limitBytes > 0 ? Math.min(100, (b.usedBytes / limitBytes) * 100) : 0,
      })),
      scannedAt: new Date(usage.scannedAt).toISOString(),
    });
  } catch (error) {
    return adminErrorResponse(error, "Gagal membaca pemakaian R2.");
  }
}
