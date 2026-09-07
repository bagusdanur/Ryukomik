import { createHmac, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const COOKIE_NAME = "ryu_image_access";
const MAX_AGE_SECONDS = 2 * 60 * 60;
const ALLOWED_HOSTS = new Set(["ryukomik.my.id", "www.ryukomik.my.id"]);

function requestIsOfficial(request: Request) {
  const source = request.headers.get("origin") || request.headers.get("referer");
  if (!source) return false;
  try {
    const host = new URL(source).hostname.toLowerCase();
    return ALLOWED_HOSTS.has(host) || (process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(host));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!requestIsOfficial(request)) {
    return NextResponse.json({ error: "Origin tidak diizinkan" }, { status: 403 });
  }
  const secret = process.env.IMAGE_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    console.error("IMAGE_ACCESS_SECRET belum dikonfigurasi");
    return NextResponse.json({ error: "Layanan akses gambar belum siap" }, { status: 503 });
  }

  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const nonce = randomBytes(12).toString("base64url");
  const payload = `v1.${expires}.${nonce}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  const response = NextResponse.json({ ok: true, expires });
  response.cookies.set(COOKIE_NAME, `${payload}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    domain: process.env.NODE_ENV === "production" ? ".ryukomik.my.id" : undefined,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  response.headers.set("cache-control", "private, no-store, max-age=0");
  return response;
}
