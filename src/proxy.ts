import { NextRequest, NextResponse } from "next/server";
import {
  normalizeChapterSlug,
  normalizeComicSlug,
  normalizeSource,
} from "@/lib/canonicalUrl";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  // Protected Project images must use their scoped image-session cookie.
  // Next's public image optimizer cannot carry that authorization safely.
  if (url.pathname === '/_next/image') {
    try {
      const image = new URL(url.searchParams.get('url') || '');
      if (image.hostname === 'storage.ryukomik.my.id' && image.pathname.startsWith('/chapters/')) return new NextResponse('Use the protected chapter reader.', { status: 403, headers: { 'Cache-Control': 'no-store' } });
    } catch { /* Non-Project image. */ }
    return NextResponse.next();
  }
  let changed = false;

  if (url.hostname === "www.ryukomik.my.id") {
    url.hostname = "ryukomik.my.id";
    changed = true;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if ((segments[0] === "komik" || segments[0] === "chapter") && segments.length >= 3) {
    const source = normalizeSource(segments[1]);
    if (source) {
      const incomingSlug = segments.slice(2).join("/");
      const slug = segments[0] === "komik"
        ? normalizeComicSlug(source, incomingSlug)
        : normalizeChapterSlug(source, incomingSlug);
      const pathname = `/${segments[0]}/${source}/${slug}`;
      if (pathname !== url.pathname) {
        url.pathname = pathname;
        changed = true;
      }
    }
  }

  return changed ? NextResponse.redirect(url, 308) : NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png).*)", '/_next/image'],
};
