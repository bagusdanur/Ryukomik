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
    } else if (parsedUrl.hostname.includes("desu.photos") || parsedUrl.hostname.includes("doujindesu")) {
      referer = "https://doujindesu.tv/"; // domain doujindesu untuk bypass referrer check
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

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        // Caching 7 hari di browser & CDN / Cloudflare DNS Cache agar server hemat bandwidth
        "Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Error fetching image", { status: 500 });
  }
}
