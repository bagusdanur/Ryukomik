import { NextResponse } from "next/server";

const BASE_URL = "https://api.ryukomik.web.id";

import { VISIBLE_SOURCES } from "@/config/sources";

const EXTERNAL_SOURCES = VISIBLE_SOURCES
  .filter(s => s.group !== "novel" && s.group !== "project")
  .map(s => ({
    id: s.id,
    label: `Source ${s.label}`,
    path: s.id === "komiku" ? "pustaka-filter?page=1" : "pustaka?page=1",
    localPath: `/api/source/${s.id}/${s.id === "komiku" ? "pustaka-filter" : "pustaka"}?page=1`,
  }));

type SourceConfig = (typeof EXTERNAL_SOURCES)[number];

// Project memakai Supabase melalui endpoint internal yang sudah di-cache. Jangan
// memanggilnya dari health check: selain menambah query database, API eksternal
// memang tidak memiliki route /project sehingga sebelumnya selalu tercatat 404.
const PROJECT_SOURCE = {
  id: "project",
  label: "Source Project",
  ok: true,
  status: "CACHE",
  latencyMs: null,
  itemCount: null,
  empty: false,
  imageProxy: "on-error",
  endpoint: "/api/source/project/pustaka?page=1",
  checkedAt: null,
  error: null,
  mode: "internal-cache",
  note: "Endpoint internal; tidak diprober agar tidak menambah query Supabase.",
} as const;

import { isAdultSource } from "@/config/sources";

function getImageProxyMode(sourceId: string) {
  return isAdultSource(sourceId) ? "always" : "on-error";
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
  const externalResults = await Promise.all(EXTERNAL_SOURCES.map(probeSource));
  const checkedAt = new Date().toISOString();
  const results = [
    ...externalResults,
    { ...PROJECT_SOURCE, checkedAt },
  ];
  const degraded = results.filter((source) => !source.ok).length;

  return NextResponse.json(
    {
      checkedAt,
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
