import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { allowSupabaseProjectReadFallback, projectApiUrl } from "@/lib/projectApiServer";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "30", 10)));

    if (!q) {
      return NextResponse.json({ success: true, data: [] });
    }

    const projectUrl = projectApiUrl(`/projects/search?q=${encodeURIComponent(q)}&limit=${limit}`);
    if (projectUrl) {
      try {
        const upstream = await fetch(projectUrl, {
          next: { revalidate: 30, tags: [`project-search:${q}`] },
        });
        if (upstream.ok) {
          const json = await upstream.json();
          const results = (json.data || []).map((item: any) => ({
            slug: item.slug,
            title: item.title,
            image: item.cover_url || item.image || "",
            source: "project",
            update: item.status || "",
            chapter_terbaru: item.latest_chapter != null ? `Chapter ${item.latest_chapter}` : "",
          }));
          const response = NextResponse.json({ success: true, data: results });
          response.headers.set(
            "Cache-Control",
            "public, s-maxage=30, stale-while-revalidate=60",
          );
          return response;
        }
      } catch (upstreamErr) {
        console.error("[api/project/search] Upstream project search error:", upstreamErr);
      }
    }

    if (!allowSupabaseProjectReadFallback()) {
      return NextResponse.json(
        { success: false, data: [], error: "Project API sementara tidak tersedia" },
        { status: 503, headers: { "Cache-Control": "public, max-age=30, stale-if-error=3600" } },
      );
    }

    let query = supabaseAdmin
      .from("project_manga")
      .select("slug, title, cover_url, type, status, genres, updated_at")
      .eq("is_published", true)
      .or(`title.ilike.%${q}%,slug.ilike.%${q}%`);

    const { data, error } = await query
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[project/search] Supabase error:", error);
      throw new Error(error.message || "Supabase query failed");
    }

    const results = (data || []).map((item) => ({
      slug: item.slug,
      title: item.title,
      image: item.cover_url || "",
      source: "project",
      update: item.status || "",
      chapter_terbaru: "",
    }));

    return NextResponse.json({ success: true, data: results });
  } catch (err: unknown) {
    console.error("[project/search] Catch error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

