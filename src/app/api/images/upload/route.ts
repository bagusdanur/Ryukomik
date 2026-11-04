import { NextResponse } from "next/server";

import { assertSameOrigin, requireUserId } from "@/lib/social/auth";
import { authErrorResponse } from "@/lib/social/authResponse";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ImgBbResponse = {
  success?: boolean;
  error?: {
    code?: number;
    message?: string;
  };
  data?: {
    url?: string;
  };
};

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireUserId(request);
  } catch (error) {
    return authErrorResponse(error) ?? jsonResponse({ error: "Login diperlukan." }, 401);
  }

  const apiKey = process.env.IMGBB_API_KEY || process.env.NEXT_PUBLIC_IMGBB_API_KEY;
  if (!apiKey) return jsonResponse({ error: "Upload gambar belum dikonfigurasi." }, 500);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("image");
  if (!(file instanceof File)) return jsonResponse({ error: "File gambar tidak ditemukan." }, 400);

  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonResponse({ error: "Format gambar harus JPG, PNG, atau WebP." }, 400);
  }
  if (file.size === 0) return jsonResponse({ error: "File gambar kosong." }, 400);
  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonResponse({ error: "Ukuran gambar maksimal 8 MB." }, 400);
  }

  const uploadForm = new FormData();
  uploadForm.append("image", file);

  let response: Response;
  try {
    response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: uploadForm,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return jsonResponse({ error: "Upload gambar gagal karena koneksi. Coba lagi." }, 502);
  }

  const responseText = await response.text().catch(() => "");
  let parsed: ImgBbResponse | null = null;
  try {
    parsed = JSON.parse(responseText) as ImgBbResponse;
  } catch {
    return jsonResponse(
      { error: "Server upload tidak memberikan respons valid. Coba lagi." },
      502,
    );
  }

  if (!parsed?.success || !parsed.data?.url) {
    return jsonResponse(
      { error: "Upload gambar gagal. Coba format lain atau kompres file." },
      502,
    );
  }

  return jsonResponse({ success: true, url: parsed.data.url }, 200);
}
