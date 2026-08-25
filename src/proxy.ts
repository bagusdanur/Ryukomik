import { NextRequest, NextResponse } from "next/server";
import {
  normalizeChapterSlug,
  normalizeComicSlug,
  normalizeSource,
} from "@/lib/canonicalUrl";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  let changed = false;

  if (url.hostname === "www.ryukomik.my.id") {
    url.hostname = "ryukomik.my.id";
    changed = true;
  }

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png).*)"],
};
