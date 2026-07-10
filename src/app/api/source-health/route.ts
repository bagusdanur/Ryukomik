import { NextResponse } from "next/server";

const BASE_URL = "https://api.ryukomik.web.id";

const SOURCES = [
  {
    id: "komikid",
    label: "Source 1",
    path: "pustaka?page=1",
    localPath: "/api/source/komikid/pustaka?page=1",
  },
  {
    id: "komiku",
    label: "Source 2",
    path: "pustaka-filter?page=1",
    localPath: "/api/source/komiku/pustaka-filter?page=1",
  },
  {
    id: "luvyaa",
    label: "Source 3",
    path: "pustaka?page=1",
    localPath: "/api/source/luvyaa/pustaka?page=1",
  },
  {
    id: "sekte",
    label: "Source 4",
    path: "pustaka?page=1",
    localPath: "/api/source/sekte/pustaka?page=1",
  },
  {
    id: "doujindesu",
    label: "Source 5",
    path: "pustaka?page=1",
    localPath: "/api/source/doujindesu/pustaka?page=1",
  },
];

type SourceConfig = (typeof SOURCES)[number];

function getImageProxyMode(sourceId: string) {
  return sourceId === "sekte" ? "always" : "on-error";
}

function getItemCount(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return Array.isArray(payload) ? payload.length : 0;
  }
  const value = payload as { data?: unknown; results?: unknown };
  if (Array.isArray(payload)) return payload.length;
  if (Array.isArray(value.data)) return value.data.length;
  if (Array.isArray(value.results)) return value.results.length;
  return 0;
}

async function probeSource(source: SourceConfig) {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(`${BASE_URL}/${source.id}/${source.path}`, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });
    const latencyMs = Math.round(performance.now() - startedAt);
    const contentType = res.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await res.json().catch(() => null)
      : null;
    const itemCount = getItemCount(payload);

    return {
      id: source.id,
      label: source.label,
      ok: res.ok && itemCount > 0,
      status: res.status,
      latencyMs,
      itemCount,
      empty: res.ok && itemCount === 0,
      imageProxy: getImageProxyMode(source.id),
      endpoint: source.localPath,
      checkedAt: new Date().toISOString(),
      error: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      id: source.id,
      label: source.label,
      ok: false,
      status: 0,
      latencyMs: Math.round(performance.now() - startedAt),
      itemCount: 0,
      empty: false,
      imageProxy: getImageProxyMode(source.id),
      endpoint: source.localPath,
      checkedAt: new Date().toISOString(),
      error: err instanceof DOMException && err.name === "AbortError"
        ? "Timeout"
        : err instanceof Error
          ? err.message
          : "Unknown error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const results = await Promise.all(SOURCES.map(probeSource));
  const degraded = results.filter((source) => !source.ok).length;

  return NextResponse.json(
    {
      checkedAt: new Date().toISOString(),
      degraded,
      sources: results,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
