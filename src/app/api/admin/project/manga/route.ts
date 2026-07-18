import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { deleteR2Prefix } from "@/lib/r2Storage";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabaseAdmin
      .from("project_manga")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
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
    const { slug, title, cover_url, description, author, status, type, genres } = body;

    if (!slug || !title) {
      return NextResponse.json({ error: "Slug and title are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("project_manga")
      .insert({
        slug,
        title,
        cover_url,
        description,
        author,
        status,
        type,
        genres,
      })
      .select()
      .single();

    if (error) throw error;

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
    const { id, slug, title, cover_url, description, author, status, type, genres } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("project_manga")
      .update({
        slug,
        title,
        cover_url,
        description,
        author,
        status,
        type,
        genres,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/komik/project/${slug}`);

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

    // 1. Ambil data manga untuk dapat slug
    const { data: manga, error: fetchError } = await supabaseAdmin
      .from("project_manga")
      .select("slug")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const mangaSlug = manga.slug;

    // 2. Ambil semua chapter untuk hapus R2 files
    const { data: chapters } = await supabaseAdmin
      .from("project_chapters")
      .select("chapter_number")
      .eq("manga_slug", mangaSlug);

    // 3. Hapus R2 files (cover + semua chapter)
    const r2Deletes: Promise<number>[] = [];
    r2Deletes.push(deleteR2Prefix(`covers/${mangaSlug}/`));
    for (const ch of chapters || []) {
      r2Deletes.push(deleteR2Prefix(`chapters/${mangaSlug}/${ch.chapter_number}/`));
    }
    await Promise.all(r2Deletes);

    // 4. Hapus chapters dari Supabase
    const { error: chapterDeleteError } = await supabaseAdmin
      .from("project_chapters")
      .delete()
      .eq("manga_slug", mangaSlug);

    if (chapterDeleteError) throw chapterDeleteError;

    // 5. Hapus manga dari Supabase
    const { error: mangaDeleteError } = await supabaseAdmin
      .from("project_manga")
      .delete()
      .eq("id", id);

    if (mangaDeleteError) throw mangaDeleteError;

    return NextResponse.json({ success: true, deletedChapters: chapters?.length || 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
