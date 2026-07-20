import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const dynamic = "force-dynamic";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
  // Matikan auto-checksum CRC32 — R2 tidak support
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      return NextResponse.json({ error: "Konfigurasi R2 tidak lengkap" }, { status: 500 });
    }

    const body = await request.json();
    const { filename, contentType, mangaSlug, chapterNumber, type } = body;

    if (!filename || !contentType || !mangaSlug || !type) {
      return NextResponse.json({ error: "Parameter tidak lengkap" }, { status: 400 });
    }

    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar" }, { status: 400 });
    }

    const bucketName = process.env.R2_BUCKET_NAME || "ryukomik-translate";
    const cdnUrl = process.env.NEXT_PUBLIC_TRANSLATE_CDN || "https://cdn.ryukomik.my.id";

    // Tentukan path upload
    let uploadPath = "";
    if (type === "cover") {
      const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
      uploadPath = `covers/${mangaSlug}/cover.${ext}`;
    } else {
      const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      uploadPath = `chapters/${mangaSlug}/${chapterNumber}/${safeName}`;
    }

    // Generate presigned URL (tanpa checksum — kompatibel dengan R2)
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uploadPath,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(r2, command, {
      expiresIn: 600,
      unhoistableHeaders: new Set(["x-amz-checksum-crc32", "x-amz-sdk-checksum-algorithm"]),
    });
    const publicUrl = `${cdnUrl}/${uploadPath}`;

    console.log(`[presign] Generated presigned URL for: ${uploadPath}`);

    return NextResponse.json({ presignedUrl, publicUrl, uploadPath });
  } catch (err: any) {
    console.error("[presign] Error:", err.message);
    return NextResponse.json({ error: err.message || "Gagal membuat presigned URL" }, { status: 500 });
  }
}
