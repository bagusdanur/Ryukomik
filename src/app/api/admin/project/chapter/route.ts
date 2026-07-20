import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { deleteR2Prefix, deleteR2File } from "@/lib/r2Storage";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mangaSlug = searchParams.get("manga_slug");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    if (!mangaSlug) {
      return NextResponse.json({ error: "manga_slug is required" }, { status: 400 });
    }

    const { data, count, error } = await supabaseAdmin
      .from("project_chapters")
      .select("id, manga_slug, chapter_number, title, image_urls, uploaded_at", { count: "exact" })
      .eq("manga_slug", mangaSlug)
      .order("chapter_number", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ data, total: count || 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { manga_slug, chapter_number, title, image_urls } = body;

    if (!manga_slug || !chapter_number) {
      return NextResponse.json({ error: "manga_slug and chapter_number are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("project_chapters")
      .insert({
        manga_slug,
        chapter_number,
        title,
        image_urls: image_urls || [],
      })
      .select()
      .single();

    if (error) throw error;

    // Update manga updated_at
    await supabaseAdmin
      .from("project_manga")
      .update({ updated_at: new Date().toISOString() })
      .eq("slug", manga_slug);

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, manga_slug, chapter_number, title, image_urls } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const { data: existingChapter, error: fetchError } = await supabaseAdmin
      .from("project_chapters")
      .select("image_urls")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabaseAdmin
      .from("project_chapters")
      .update({
        manga_slug,
        chapter_number,
        title,
        image_urls: image_urls || [],
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Hapus orphan files di R2
    if (existingChapter?.image_urls) {
      const oldUrls = existingChapter.image_urls as string[];
      const newUrls = (image_urls || []) as string[];
      const orphanUrls = oldUrls.filter((url) => !newUrls.includes(url));

      for (const url of orphanUrls) {
        try {
          const urlObj = new URL(url);
          const key = urlObj.pathname.substring(1); // Hapus leading slash
          if (key.startsWith("chapters/")) {
            await deleteR2File(key);
            console.log(`[R2] Deleted orphan file: ${key}`);
          }
        } catch (e) {
          console.error(`[R2] Gagal memparsing URL orphan: ${url}`, e);
        }
      }
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // 1. Ambil data chapter untuk dapat manga_slug & chapter_number
    const { data: chapter, error: fetchError } = await supabaseAdmin
      .from("project_chapters")
      .select("manga_slug, chapter_number")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    // 2. Hapus R2 files untuk chapter ini
    await deleteR2Prefix(`chapters/${chapter.manga_slug}/${chapter.chapter_number}/`);

    // 3. Hapus chapter dari Supabase
    const { error: deleteError } = await supabaseAdmin
      .from("project_chapters")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
