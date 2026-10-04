import { NextResponse } from "next/server";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { bearerToken, getChapterAccess } from "@/lib/chapterAccess";
import { parseProjectImageScope } from "@/lib/chapterAccessPolicy";
import { signImageAccessCookie } from "@/lib/imageAccessCookie";

const IMAGE_TTL = 60 * 60 * 24 * 7;
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB guard

// Beberapa CDN gambar pakai sertifikat yang tidak cocok hostname / belum ada di
// trust store Node (mis. img2.komiku.org, uploadcdn.lonedev.my.id). Route ini
// hanya mengambil gambar publik read-only tanpa kredensial apa pun, jadi
// verifikasi TLS dilonggarkan khusus di sini. Set IMAGE_PROXY_STRICT_TLS=1
// untuk mengembalikan ke mode ketat.
const ALLOW_INSECURE = process.env.IMAGE_PROXY_STRICT_TLS !== "1";

const FALLBACK_REFERERS = [
  "https://doujindesu.tv/",
  "https://doujindesu.com/",
];

type Fetched = { status: number; headers: Record<string, string>; body: Buffer };

function getCacheKey(url: string) {
  // Version prefix: the pre-fix proxy cached the anti-hotlink promo under the
  // same URL, and it did so with a 7-day public cache plus an URL-derived ETag.
  // Bumping this invalidates those poisoned entries instead of letting an
  // If-None-Match replay the promo after the fix ships.
  return `imgv2_${Buffer.from(url).toString("base64url").slice(0, 96)}`;
}

function getEtag(url: string) {
  return `"${getCacheKey(url)}"`;
}

function getCacheHeaders(etag: string, contentType?: string) {
  const cacheControl = `public, max-age=${IMAGE_TTL}, s-maxage=${IMAGE_TTL}, stale-while-revalidate=${IMAGE_TTL}, immutable`;

  return {
    ...(contentType ? { "Content-Type": contentType } : {}),
    "Cache-Control": cacheControl,
    "CDN-Cache-Control": cacheControl,
    "Vercel-CDN-Cache-Control": cacheControl,
    ETag: etag,
    Vary: "Accept-Encoding, Accept",
  };
}

function getReferers(url: string) {
  const parsed = new URL(url);
  const referers: string[] = [];

  if (parsed.hostname === "desu.photos" || parsed.hostname.endsWith(".desu.photos")) {
    referers.push(...FALLBACK_REFERERS);
  }

  referers.push(`${parsed.origin}/`);
  return Array.from(new Set(referers));
}

// ---------------------------------------------------------------------------
// Anti-hotlink image guard (Cloudflare Worker `ryukomik-image-guard`).
//
// Chapter objects on storage.ryukomik.my.id are served through the guard,
// which answers with a promo placeholder instead of the real page unless the
// request carries BOTH an official Ryukomik Referer and a signed
// `ryu_image_access` cookie scoped to that chapter. The reader satisfies this
// because the browser holds the cookie issued by /api/image-session; a plain
// server-side proxy has neither, so downloads used to get the promo image.
// Mint the same cookie here (same payload format and IMAGE_ACCESS_SECRET) and
// send it with an official Referer.
// ---------------------------------------------------------------------------
const IMAGE_GUARD_HOST = "storage.ryukomik.my.id";
const IMAGE_GUARD_REFERER = "https://ryukomik.my.id/";
// fetch() bawaan Next.js (undici) memakai verifikasi TLS ketat dan tidak bisa
// dilonggarkan per-request. Pakai http(s).request native Node agar bisa.
function fetchImage(url: string, referer: string, cookie?: string, timeoutMs = 15000): Promise<Fetched> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const doRequest = isHttps ? httpsRequest : httpRequest;

    const req = doRequest(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Referer: referer,
          "Accept-Encoding": "identity",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        ...(isHttps && ALLOW_INSECURE ? { rejectUnauthorized: false } : {}),
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            req.destroy(new Error("Image too large"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({
            status: res.statusCode || 0,
            headers: Object.fromEntries(
              Object.entries(res.headers).map(([k, v]) => [
                k,
                Array.isArray(v) ? v.join(",") : String(v ?? ""),
              ])
            ),
            body: Buffer.concat(chunks),
          })
        );
        res.on("error", reject);
      }
    );

    req.on("timeout", () => req.destroy(new Error("Image fetch timeout")));
    req.on("error", reject);
    req.end();
  });
}

export async function GET(req: Request) {
  let target = "";
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    target = url || "";

    if (!url) return new NextResponse("Missing url", { status: 400 });

    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return new NextResponse("Invalid url", { status: 400 });
    }

    const guarded = parseProjectImageScope(url);
    let cookie: string | null = null;
    if (guarded) {
      try {
        const access = await getChapterAccess(guarded.slug, guarded.chapter, bearerToken(req));
        if (!access.allowed) return new NextResponse('Premium aktif diperlukan.', { status: bearerToken(req) ? 403 : 401, headers: { 'Cache-Control': 'no-store' } });
        cookie = `ryu_image_access=${signImageAccessCookie(guarded.scope, access.grant, access.lockVersion, access.expires)}`;
      } catch { return new NextResponse('Layanan akses chapter belum tersedia.', { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
    }
    const etag = getEtag(url);
    const cacheHeaders = guarded ? { 'Cache-Control': 'private, no-store, max-age=0', 'CDN-Cache-Control': 'no-store', Vary: 'Authorization' } : getCacheHeaders(etag);
    if (!guarded && req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: cacheHeaders });
    const guardedScope = guarded?.scope;
    const referers = guarded ? [IMAGE_GUARD_REFERER] : getReferers(url);

    let result: Fetched | null = null;
    let guardedDenial: string | null = null;
    const failures: string[] = [];

    for (const referer of referers) {
      try {
        const res = await fetchImage(url, referer, cookie || undefined);
        if (res.status >= 200 && res.status < 300) {
          if (res.headers["x-ryukomik-image-guard"] === "promo") {
            guardedDenial = guardedScope
              ? "guard menolak akses gambar (cookie/Referer tidak diterima)"
              : "gambar dilindungi anti-hotlink";
            continue;
          }
          result = res;
          break;
        }
        failures.push(String(res.status));
      } catch (error) {
        failures.push((error as Error)?.message || "unknown");
      }
    }

    if (!result) {
      if (guardedDenial) {
        console.error(`Image guard denied :: ${url} :: ${guardedDenial}`);
        return new NextResponse(
          "Gambar chapter dilindungi anti-hotlink dan tidak dapat diambil.",
          { status: 502, headers: { "Cache-Control": "no-store" } },
        );
      }
      console.error(`Image fetch failed [${failures.join(" -> ")}] :: ${url}`);
      return new NextResponse("Image fetch failed", {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (result.body.byteLength < 1024) {
      return new NextResponse("Image too small, likely corrupt", {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const contentType = result.headers["content-type"] || "image/jpeg";

    return new NextResponse(new Uint8Array(result.body), {
      headers: { ...cacheHeaders, "Content-Type": contentType },
    });
  } catch (error) {
    console.error(`Image route error: ${(error as Error)?.message || "unknown"} :: ${target}`);
    return new NextResponse("Error", { status: 500 });
  }
}
