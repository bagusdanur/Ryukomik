import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Inisialisasi client R2
// Credentials diambil dari .env.local
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const mangaSlug = formData.get("manga_slug") as string;
    const chapterNumber = formData.get("chapter_number") as string;
    const type = formData.get("type") as string; // 'cover' or 'chapter'

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bucketName = process.env.R2_BUCKET_NAME || "ryukomik-translate";
    const cdnUrl = process.env.NEXT_PUBLIC_TRANSLATE_CDN || "https://cdn.ryukomik.my.id";

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Gunakan nama original untuk chapter, dan cover.webp untuk cover
    let filename = file.name;
    let uploadPath = "";

    if (type === "cover") {
      filename = "cover.webp"; // atau biarkan sesuai ekstensi
      uploadPath = `covers/${mangaSlug}/${filename}`;
    } else {
      uploadPath = `chapters/${mangaSlug}/${chapterNumber}/${filename}`;
    }

    // Upload ke Cloudflare R2
    await r2.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: uploadPath,
        Body: buffer,
        ContentType: file.type,
      })
    );

    // Kembalikan URL publik
    const publicUrl = `${cdnUrl}/${uploadPath}`;

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
