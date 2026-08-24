import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { allowSupabaseProjectReadFallback, projectApiUrl } from "@/lib/projectApiServer";

type FilterOption = { value: string; label: string };

const makeOptions = (values: string[], placeholder: string): FilterOption[] => [
  { value: "", label: placeholder },
  ...[...new Set(values.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value })),
];

export async function GET() {
  try {
    const projectUrl = projectApiUrl("/projects/filters");
    if (projectUrl) {
      try {
        const upstream = await fetch(projectUrl, { next: { revalidate: 3600 } });
        if (upstream.ok) {
          const json = await upstream.json();
          return NextResponse.json(json, {
            headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
          });
        }
      } catch (error) {
        console.error("[api/project/filters] Project API error:", error);
      }
    }

    if (!allowSupabaseProjectReadFallback()) {
      return NextResponse.json(
        { success: false, error: "Project API sementara tidak tersedia" },
        { status: 503, headers: { "Cache-Control": "public, max-age=30, stale-if-error=86400" } },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("project_manga")
      .select("type, status, genres")
      .eq("is_published", true);
    if (error) throw error;
    const rows = data || [];
    const genres = rows.flatMap((row) => Array.isArray(row.genres) ? row.genres : []);
    const genreOptions = makeOptions(genres, "Genre");
    return NextResponse.json(
      {
        success: true,
        data: {
          tipe: makeOptions(rows.map((row) => row.type || ""), "Tipe"),
          status: makeOptions(rows.map((row) => row.status || ""), "Status"),
          genre: genreOptions,
          genre2: [{ value: "", label: "Genre 2" }, ...genreOptions.slice(1)],
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
