import { createHmac, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getRoleFromBearerToken, getVerifiedUserId } from "@/lib/serverRoleCache";
import { projectApiFetch, projectApiUrl } from "@/lib/projectApiServer";
import { verifyDraftPreviewToken } from "@/lib/draftPreviewToken";

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

function parseChapter(value: unknown) {
  const raw = typeof value === "string" ? value.trim().replace(/^\/+|\/+$/g, "") : "";
  const match = raw.match(/^([a-z0-9][a-z0-9-]*)\/chapter-(\d+(?:\.\d+)?)$/i);
  if (!match) return null;
  return { mangaSlug: match[1].toLowerCase(), chapterNumber: match[2], scope: `/chapters/${match[1].toLowerCase()}/${match[2]}/` };
}

function bearer(request: Request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
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

  const body = await request.json().catch(() => ({})) as { chapter?: unknown; context?: unknown; previewToken?: unknown };
  const chapter = parseChapter(body.chapter);
  if (!chapter) return NextResponse.json({ error: "Chapter tidak valid" }, { status: 400 });

  const context = typeof body.context === "string" ? body.context : "reader";
  if (context === "public-draft-preview") {
    const preview = typeof body.previewToken === "string" ? verifyDraftPreviewToken(body.previewToken) : null;
    if (!preview) return NextResponse.json({ error: "Link preview tidak valid" }, { status: 401 });
    const result = await projectApiFetch<{ data?: { id: string; manga_slug: string; chapter_number: number; is_published: boolean } }>(`/admin/chapters/${encodeURIComponent(preview.chapterId)}`, { cache: "no-store" }).catch(() => null);
    const item = result?.data;
    if (!item || item.is_published || item.manga_slug !== chapter.mangaSlug || String(item.chapter_number) !== chapter.chapterNumber) {
      return NextResponse.json({ error: "Preview chapter tidak cocok" }, { status: 403 });
    }
  } else if (context === "dashboard-preview") {
    try {
      const role = await getRoleFromBearerToken(bearer(request));
      if (!role.isAdmin && !role.isStaff) throw new Error("forbidden");
    } catch {
      return NextResponse.json({ error: "Akses dashboard ditolak" }, { status: 403 });
    }
  } else {
    const url = projectApiUrl(`/projects/${encodeURIComponent(chapter.mangaSlug)}/chapters/${encodeURIComponent(chapter.chapterNumber)}`);
    if (url) {
      const payload = await fetch(url, { cache: "no-store" }).then((value) => value.json()).catch(() => null);
      if (!payload?.data) return NextResponse.json({ error: "Chapter tidak ditemukan" }, { status: 404 });
      const lockUntil = payload.data.login_lock_until ? new Date(payload.data.login_lock_until).getTime() : 0;
      if (lockUntil > Date.now()) {
        try { await getVerifiedUserId(bearer(request)); }
        catch { return NextResponse.json({ error: "Login diperlukan selama chapter dikunci", lockUntil: payload.data.login_lock_until }, { status: 401 }); }
      }
    }
  }

  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const nonce = randomBytes(12).toString("base64url");
  const encodedScope = Buffer.from(chapter.scope).toString("base64url");
  const payload = `v2.${expires}.${nonce}.${encodedScope}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  const response = NextResponse.json({ ok: true, expires });
  response.cookies.set(COOKIE_NAME, "", {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    domain: process.env.NODE_ENV === "production" ? ".ryukomik.my.id" : undefined,
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(COOKIE_NAME, `${payload}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    domain: process.env.NODE_ENV === "production" ? ".ryukomik.my.id" : undefined,
    path: chapter.scope,
    maxAge: MAX_AGE_SECONDS,
  });
  response.headers.set("cache-control", "private, no-store, max-age=0");
  return response;
}
