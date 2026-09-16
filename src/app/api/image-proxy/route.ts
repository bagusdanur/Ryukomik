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

function getWithNode(url: URL): Promise<Fetched> {
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(targetUrl);
    const parsedUrl = new URL(decodedUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return new NextResponse("Unsupported protocol", { status: 400 });
    }

    const response = await getWithNode(parsedUrl);

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
