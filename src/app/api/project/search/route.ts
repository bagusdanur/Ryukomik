import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    if (!q.trim()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { data, error } = await supabaseAdmin
      .from("project_manga")
      .select("slug, title, cover_url, type, status, genres, updated_at")
      .ilike("title", `%${q}%`)
      .order("updated_at", { ascending: false })
      .limit(30);

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
