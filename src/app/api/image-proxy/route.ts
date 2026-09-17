import { NextRequest, NextResponse } from "next/server";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";

// Beberapa CDN gambar (mis. balancer kustom) memakai sertifikat yang belum ada
// di trust store Node -> fetch() gagal "unable to get local issuer certificate".
// Route ini hanya mengambil gambar publik read-only tanpa kredensial apa pun,
// jadi verifikasi TLS dilonggarkan khusus di sini.
const ALLOW_INSECURE = process.env.IMAGE_PROXY_STRICT_TLS !== "1";
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB guard

type Fetched = { status: number; headers: Record<string, string>; body: Buffer };

function getWithNode(url: URL, referer: string): Promise<Fetched> {
  return new Promise((resolve, reject) => {
    const isHttps = url.protocol === "https:";
    const doRequest = isHttps ? httpsRequest : httpRequest;
    const req = doRequest(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Accept-Encoding": "identity",
          Referer: referer,
        },
        // Hanya berlaku untuk https
        ...(isHttps && ALLOW_INSECURE ? { rejectUnauthorized: false } : {}),
        timeout: 15000,
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
              Object.entries(res.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : String(v ?? "")])
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

const ALLOWED_IMAGE_HOSTS = new Set([
  "pic.desu.xxx",
  "doujin.desu.xxx",
  "doujindesu.tv",
  "doujindesu.com",
  "sektedoujin.com",
  "kiryuu.org",
  "kiryuu.to",
]);

const ALLOWED_IMAGE_HOST_SUFFIXES = [
  "desu.pics",
  "desu.photos",
  "doujindesu.tv",
  "doujindesu.com",
  "sektedoujin.com",
  "kiryuu.org",
  "kiryuu.to",
] as const;

function isHostnameOrSubdomain(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function isAllowedImageHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return (
    ALLOWED_IMAGE_HOSTS.has(normalized) ||
    ALLOWED_IMAGE_HOST_SUFFIXES.some((domain) => isHostnameOrSubdomain(normalized, domain))
  );
}

function isDesuImageHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return (
    isHostnameOrSubdomain(normalized, "desu.pics") ||
    isHostnameOrSubdomain(normalized, "desu.photos") ||
    normalized === "pic.desu.xxx"
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const decodedUrl = targetUrl;
    const parsedUrl = new URL(decodedUrl);
    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.username ||
      parsedUrl.password ||
      parsedUrl.port ||
      !isAllowedImageHostname(parsedUrl.hostname)
    ) {
      return new NextResponse("Image host is not allowed", { status: 403 });
    }

    // Tentukan Referer header berdasarkan domain gambar agar tidak terblokir hotlinking
    let referer = parsedUrl.origin;
    if (
      isHostnameOrSubdomain(parsedUrl.hostname, "kiryuu.org") ||
      isHostnameOrSubdomain(parsedUrl.hostname, "kiryuu.to")
    ) {
      referer = "https://kiryuu.org/"; // domain kiryuu untuk bypass referrer check
    } else if (isDesuImageHostname(parsedUrl.hostname)) {
      referer = "https://doujin.desu.xxx/";
    } else if (
      isHostnameOrSubdomain(parsedUrl.hostname, "doujindesu.tv") ||
      isHostnameOrSubdomain(parsedUrl.hostname, "doujindesu.com") ||
      isHostnameOrSubdomain(parsedUrl.hostname, "sektedoujin.com")
    ) {
      referer = "https://doujin.desu.xxx/";
    }

    const response = await getWithNode(parsedUrl, referer);

    if (response.status < 200 || response.status >= 300) {
      return new NextResponse(`Failed to fetch image: HTTP ${response.status}`, {
        status: response.status || 502,
      });
    }

    const contentType = response.headers["content-type"] || "image/jpeg";
    const buffer = response.body;

    // Validasi: jika origin kirim Content-Length, pastikan buffer lengkap
    const expectedLength = Number(response.headers["content-length"] || 0);
    if (expectedLength > 0 && buffer.byteLength < expectedLength) {
      return new NextResponse("Incomplete image response from origin", {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Validasi: gambar valid minimal ~1KB
    if (buffer.byteLength < 1024) {
      return new NextResponse("Image too small, likely corrupt or empty", {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    const message = (error as Error)?.message || "unknown";
    console.error(`Image proxy error: ${message} :: ${targetUrl}`);
    return new NextResponse("Error fetching image", { status: 500 });
  }
}
