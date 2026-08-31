import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminApi";
import { CONTENT_API_URL } from "@/lib/contentApi";

type ThunderItem = Record<string, unknown>;
const METADATA_SOURCES = new Set(["thunder", "mgeko", "demon", "evascan"]);

function cleanText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text === "-" || /^tidak ada (sinopsis|data)\.?$/i.test(text)) return "";
  return text;
}

function normalizeChoice(item: ThunderItem) {
  return {
    slug: cleanText(item.slug),
    title: cleanText(item.title),
    image: cleanText(item.image),
  };
}

function normalizeDetail(item: ThunderItem, slug: string) {
  const genres = Array.isArray(item.genres)
    ? item.genres.map(cleanText).filter(Boolean)
    : [];
  const rawType = cleanText(item.type).toLowerCase();
  const type = ["manga", "manhwa", "manhua", "comic", "18+"].includes(rawType)
    ? rawType
    : "comic";
  const rawStatus = cleanText(item.status).toLowerCase();
  const status = ["ongoing", "completed", "hiatus", "dropped", "cancelled"].includes(rawStatus)
    ? rawStatus
    : "ongoing";

  return {
    slug,
    title: cleanText(item.title),
    cover_url: cleanText(item.thumbnail || item.image),
    description: cleanText(item.synopsis || item.description),
    author: cleanText(item.Pengarang || item.author),
    type,
    status,
    genres,
  };
}

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { searchParams } = new URL(request.url);
  const source = (searchParams.get("source") || "thunder").trim().toLowerCase();
  const query = (searchParams.get("q") || "").trim().slice(0, 120);
  const slug = (searchParams.get("slug") || "").trim().replace(/^\/+|\/+$/g, "").slice(0, 240);

  if (!METADATA_SOURCES.has(source)) {
    return NextResponse.json({ error: "Source metadata tidak didukung." }, { status: 400 });
  }

  if (!query && !slug) {
    return NextResponse.json({ error: "Query atau slug Thunder diperlukan." }, { status: 400 });
  }

  try {
    const path = slug
      ? `/${source}/detail/${encodeURIComponent(slug)}`
      : `/${source}/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(`${CONTENT_API_URL}${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || payload?.success === false) {
      return NextResponse.json(
        { error: payload?.message || `${source} API gagal (${response.status}).` },
        { status: response.status === 404 ? 404 : 502 },
      );
    }

    if (slug) {
      const detail = payload?.data ?? payload;
      return NextResponse.json({ success: true, data: normalizeDetail(detail || {}, slug) }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    const items = (Array.isArray(payload) ? payload : payload?.data || [])
      .map((item: ThunderItem) => normalizeChoice(item))
      .filter((item: { slug: string; title: string }) => item.slug && item.title)
      .slice(0, 12);
    return NextResponse.json({ success: true, data: items }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? `${source} API melewati batas waktu.`
      : `Gagal mengambil metadata ${source}.`;
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
