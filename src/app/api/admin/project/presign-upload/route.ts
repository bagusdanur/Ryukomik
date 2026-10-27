import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { targetById } from "@/lib/r2Targets";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { verifyAdminRequest, adminErrorResponse } from "@/lib/adminApi";

export const dynamic = "force-dynamic";

// Client R2 dipilih lewat r2Targets (akun kedua untuk upload baru).

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      return NextResponse.json({ error: "Konfigurasi R2 tidak lengkap" }, { status: 500 });
    }

    const body = await request.json();
    const { filename, contentType, mangaSlug, chapterNumber, type, storageAccount } = body;

    if (!filename || !contentType || !mangaSlug || !type) {
      return NextResponse.json({ error: "Parameter tidak lengkap" }, { status: 400 });
    }

    const safeMangaSlug = String(mangaSlug).replace(/[^a-zA-Z0-9\-_]/g, "");
    if (!safeMangaSlug) {
      return NextResponse.json({ error: "Slug manga tidak valid" }, { status: 400 });
    }

    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar" }, { status: 400 });
    }

    // Admin boleh memilih akun tujuan (akun 1 / akun 2). Default: akun kedua.
    const target = targetById(typeof storageAccount === "string" ? storageAccount : undefined);
    const bucketName = target.bucket;
    const cdnUrl = target.publicBase;

    let uploadPath = "";
    if (type === "cover") {
      const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
      uploadPath = `covers/${safeMangaSlug}/cover.${ext}`;
    } else {
      const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const safeChapterNumber = String(chapterNumber).replace(/[^a-zA-Z0-9.\-_]/g, "");
      uploadPath = `chapters/${safeMangaSlug}/${safeChapterNumber}/${safeName}`;
    }

    // Generate presigned URL (tanpa checksum — kompatibel dengan R2)
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uploadPath,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(target.client, command, {
      expiresIn: 600,
      unhoistableHeaders: new Set(["x-amz-checksum-crc32", "x-amz-sdk-checksum-algorithm"]),
    });
    const publicUrl = `${cdnUrl}/${uploadPath}`;

    console.log(`[presign] Generated presigned URL for: ${uploadPath}`);

    return NextResponse.json({ presignedUrl, publicUrl, uploadPath });
  } catch (err: unknown) {
    console.error("[presign] Error:", err);
    return adminErrorResponse(err, "Gagal membuat presigned URL");
  }
}
