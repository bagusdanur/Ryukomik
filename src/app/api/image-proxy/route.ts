import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(targetUrl);
    const parsedUrl = new URL(decodedUrl);

    // Tentukan Referer header berdasarkan domain gambar agar tidak terblokir hotlinking
    let referer = parsedUrl.origin;
    if (parsedUrl.hostname.includes("kiryuu")) {
      referer = "https://kiryuu.org/"; // domain kiryuu untuk bypass referrer check
    } else if (
      parsedUrl.hostname.includes("desu.") ||
      parsedUrl.hostname.includes("doujindesu") ||
      parsedUrl.hostname.includes("sektedoujin")
    ) {
      referer = "https://doujin.desu.xxx/";  // ganti dari doujindesu.tv ke domain baru
    }

    const response = await fetch(decodedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": referer,
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, {
        status: response.status,
      });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    // Validasi: jika origin kirim Content-Length, pastikan buffer lengkap (tidak truncated)
    const expectedLength = Number(response.headers.get("content-length") || 0);
    if (expectedLength > 0 && buffer.byteLength < expectedLength) {
      return new NextResponse("Incomplete image response from origin", {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Validasi: gambar valid minimal ~1KB (response kecil kemungkinan corrupt/placeholder)
    if (buffer.byteLength < 1024) {
      return new NextResponse("Image too small, likely corrupt or empty", {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        // Caching 7 hari di browser & CDN / Cloudflare DNS Cache agar server hemat bandwidth
        "Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Error fetching image", { status: 500 });
  }
}
