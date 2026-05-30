import { NextResponse } from "next/server";

const IMAGE_TTL = 60 * 60 * 24 * 7;
const FALLBACK_REFERERS = [
  "https://doujindesu.tv/",
  "https://doujindesu.com/",
];

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
    "ETag": etag,
    "Vary": "Accept-Encoding, Accept",
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

async function fetchImage(url: string, referer: string) {
  return fetch(url, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Referer: referer,
    },
    next: { revalidate: IMAGE_TTL, tags: [`image:${getCacheKey(url)}`] },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) return new NextResponse("Missing url", { status: 400 });

    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return new NextResponse("Invalid url", { status: 400 });
    }

    const etag = getEtag(url);
    if (req.headers.get("if-none-match") === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: getCacheHeaders(etag),
      });
    }

    let res: Response | null = null;

    for (const referer of getReferers(url)) {
      res = await fetchImage(url, referer);
      if (res.ok) break;
    }

    if (!res?.ok) {
      return new NextResponse("Image fetch failed", {
        status: res?.status || 502,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";

    return new NextResponse(buffer, {
      headers: getCacheHeaders(etag, contentType),
    });
  } catch (err) {
    return new NextResponse("Error", { status: 500 });
  }
}
