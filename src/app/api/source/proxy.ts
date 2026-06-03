import { NextResponse } from "next/server";

const BASE_URL = "https://api.ryukomik.web.id";

const CACHE_TTL = {
  filters: 3600,
  pustaka: 600,
  list: 3600,
  search: 300,
  detail: 3600,
  chapter: 604800,
  home: 600,
  default: 60,
};

function getTTL(path: string) {
  if (path.includes("filters")) return CACHE_TTL.filters;
  if (path.includes("pustaka")) return CACHE_TTL.pustaka;
  if (path.includes("list")) return CACHE_TTL.list;
  if (path.includes("search")) return CACHE_TTL.search;
  if (path.includes("detail")) return CACHE_TTL.detail;
  if (path.includes("chapter")) return CACHE_TTL.chapter;
  if (path.includes("home")) return CACHE_TTL.home;
  return CACHE_TTL.default;
}

export async function proxySource(request: Request, pathParts: string[]) {
  try {
    const path = pathParts.filter(Boolean).join("/");
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const upstreamUrl = `${BASE_URL}/${path}${query ? `?${query}` : ""}`;
    const ttl = getTTL(path);

    const res = await fetch(upstreamUrl, {
      next: { revalidate: ttl },
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${res.status}` },
        { status: res.status }
      );
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Upstream returned non-JSON response" },
        { status: 502 }
      );
    }

    const json = await res.json();

    return NextResponse.json(json, {
      headers: {
        "Cache-Control": `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 10}`,
      },
    });
  } catch (err) {
    console.error("[source proxy error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
