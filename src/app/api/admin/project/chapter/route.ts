import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mangaSlug = searchParams.get("manga_slug");

    if (!mangaSlug) {
      return NextResponse.json({ error: "Manga slug is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("project_chapters")
      .select("*")
      .eq("manga_slug", mangaSlug)
      .order("chapter_number", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });
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

    if (!manga_slug || chapter_number === undefined) {
      return NextResponse.json({ error: "Manga slug and chapter number are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("project_chapters")
      .insert({
        manga_slug,
        chapter_number: Number(chapter_number),
        title,
        image_urls: image_urls || [],
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/komik/project/${manga_slug}`);
    revalidatePath(`/chapter/project/${manga_slug}/chapter-${chapter_number}`);

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
    const { id, title, image_urls } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("project_chapters")
      .update({
        title,
        image_urls,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    
    if (data?.manga_slug) {
      revalidatePath(`/komik/project/${data.manga_slug}`);
      revalidatePath(`/chapter/project/${data.manga_slug}/chapter-${data.chapter_number}`);
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

    const { error } = await supabaseAdmin.from("project_chapters").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
