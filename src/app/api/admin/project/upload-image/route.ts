import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Paksa route ini selalu dynamic (tidak di-cache)
export const dynamic = "force-dynamic";
// Tambah timeout 60 detik untuk upload file besar (Vercel default 10s)
export const maxDuration = 60;

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

    // Validasi env vars R2 sebelum proses upload
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      console.error("[upload-image] R2 env vars tidak lengkap:", {
        accountId: !!process.env.R2_ACCOUNT_ID,
        accessKey: !!process.env.R2_ACCESS_KEY_ID,
        secretKey: !!process.env.R2_SECRET_ACCESS_KEY,
      });
      return NextResponse.json({ error: "Konfigurasi R2 storage tidak lengkap di server" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const mangaSlug = formData.get("manga_slug") as string;
    const chapterNumber = formData.get("chapter_number") as string;
    const type = formData.get("type") as string; // 'cover' or 'chapter'

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar" }, { status: 400 });
    }

    const bucketName = process.env.R2_BUCKET_NAME || "ryukomik-translate";
    const cdnUrl = process.env.NEXT_PUBLIC_TRANSLATE_CDN || "https://cdn.ryukomik.my.id";

    const buffer = Buffer.from(await file.arrayBuffer());

    // Gunakan nama original untuk chapter
    // Untuk cover: pertahankan ekstensi asli agar tidak terjadi MIME-type mismatch
    let filename = file.name;
    let uploadPath = "";

    if (type === "cover") {
      // Ambil ekstensi asli dari nama file (bukan paksa .webp agar tidak mismatch)
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      filename = `cover.${ext}`;
      uploadPath = `covers/${mangaSlug}/${filename}`;
    } else {
      // Chapter: pakai nama file asli (sudah diurutkan di frontend)
      uploadPath = `chapters/${mangaSlug}/${chapterNumber}/${filename}`;
    }

    console.log(`[upload-image] Uploading ${type}: ${uploadPath} (${file.type}, ${buffer.length} bytes) → bucket: ${bucketName}`);

    // Upload ke Cloudflare R2
    await r2.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: uploadPath,
        Body: buffer,
        ContentType: file.type, // Gunakan MIME type asli dari browser
      })
    );

    // Kembalikan URL publik
    const publicUrl = `${cdnUrl}/${uploadPath}`;
    console.log(`[upload-image] Upload sukses: ${publicUrl}`);

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error("[upload-image] Upload error:", {
      message: err.message,
      code: err.Code || err.code,
      bucket: process.env.R2_BUCKET_NAME,
      accountId: process.env.R2_ACCOUNT_ID ? `${process.env.R2_ACCOUNT_ID.slice(0, 8)}...` : "MISSING",
    });
    return NextResponse.json({ error: err.message || "Upload gagal" }, { status: 500 });
  }
}
