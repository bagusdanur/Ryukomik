import { NextResponse } from "next/server";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";

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
  return `img_${Buffer.from(url).toString("base64url").slice(0, 96)}`;
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

// fetch() bawaan Next.js (undici) memakai verifikasi TLS ketat dan tidak bisa
// dilonggarkan per-request. Pakai http(s).request native Node agar bisa.
function fetchImage(url: string, referer: string, timeoutMs = 15000): Promise<Fetched> {
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

    const etag = getEtag(url);
    if (req.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: getCacheHeaders(etag) });
    }

    let result: Fetched | null = null;
    const failures: string[] = [];

    for (const referer of getReferers(url)) {
      try {
        const res = await fetchImage(url, referer);
        if (res.status >= 200 && res.status < 300) {
          result = res;
          break;
        }
        failures.push(String(res.status));
      } catch (error) {
        failures.push((error as Error)?.message || "unknown");
      }
    }

    if (!result) {
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
      headers: getCacheHeaders(etag, contentType),
    });
  } catch (error) {
    console.error(`Image route error: ${(error as Error)?.message || "unknown"} :: ${target}`);
    return new NextResponse("Error", { status: 500 });
  }
}
