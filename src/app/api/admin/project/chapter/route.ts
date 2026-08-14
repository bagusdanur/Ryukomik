import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { deleteR2Prefix, deleteR2File } from "@/lib/r2Storage";
import { verifyAdminRequest, adminErrorResponse } from "@/lib/adminApi";
import { revalidatePath, revalidateTag } from "next/cache";
import { enqueueProjectDiscordEvent } from "@/lib/projectDiscordEvents";

function revalidateProjectContent(mangaSlug: string) {
  revalidateTag("source-project-pustaka", { expire: 0 });
  revalidateTag(`project-detail:${mangaSlug}`, { expire: 0 });
  revalidateTag("home-banner", { expire: 0 });
  revalidatePath("/", "page");
  revalidatePath(`/komik/project/${mangaSlug}`, "page");
  revalidatePath("/api/project/pustaka", "page");
}

function revalidateProjectChapter(mangaSlug: string, chapterNumber: string | number) {
  const chapter = `chapter-${chapterNumber}`;
  revalidateTag(`project-chapter:${mangaSlug}:${chapter}`, { expire: 0 });
  revalidatePath(`/chapter/project/${mangaSlug}/${chapter}`, "page");
  revalidatePath(`/api/project/chapter/${mangaSlug}/${chapter}`);
}

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
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
      .select("id, manga_slug, chapter_number, title, image_urls, is_published, uploaded_at", { count: "exact" })
      .eq("manga_slug", mangaSlug)
      .order("chapter_number", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ data, total: count || 0 });
  } catch (err: unknown) {
    return adminErrorResponse(err, "Gagal mengambil data chapter.");
  }
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = await request.json();
    const { manga_slug, chapter_number, title, image_urls, is_published = false } = body;

    if (!manga_slug || chapter_number == null) {
      return NextResponse.json({ error: "manga_slug and chapter_number are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("project_chapters")
      .insert({
        manga_slug,
        chapter_number,
        title,
        image_urls: image_urls || [],
        is_published: Boolean(is_published),
      })
      .select()
      .single();

    if (error) throw error;

    // Update manga updated_at
    await supabaseAdmin
      .from("project_manga")
      .update({ updated_at: new Date().toISOString() })
      .eq("slug", manga_slug);

    const { data: manga, error: mangaError } = await supabaseAdmin
      .from("project_manga")
      .select("slug,title,cover_url,type,status,genres,is_published")
      .eq("slug", manga_slug)
      .single();
    if (mangaError) throw mangaError;
    if (data.is_published && manga.is_published && !["dropped", "cancelled"].includes(manga.status || "")) {
      await enqueueProjectDiscordEvent("chapter_published", manga, {
        chapter_number: data.chapter_number,
        chapter_title: data.title || "",
      });
    }

    revalidateProjectContent(manga_slug);
    revalidateProjectChapter(manga_slug, data.chapter_number);

    return NextResponse.json({ data });
  } catch (err: unknown) {
    return adminErrorResponse(err, "Gagal menambah data chapter.");
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = await request.json();
    const { id, manga_slug, chapter_number, title, image_urls, is_published } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const { data: existingChapter, error: fetchError } = await supabaseAdmin
      .from("project_chapters")
      .select("manga_slug, chapter_number, image_urls, is_published")
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
        is_published: Boolean(is_published),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    if (!existingChapter.is_published && data.is_published) {
      const { data: manga } = await supabaseAdmin
        .from("project_manga")
        .select("slug,title,cover_url,type,status,genres,is_published")
        .eq("slug", manga_slug)
        .maybeSingle();
      if (manga?.is_published && !["dropped", "cancelled"].includes(manga.status || "")) {
        await enqueueProjectDiscordEvent("chapter_published", manga, {
          chapter_number: data.chapter_number,
          chapter_title: data.title || "",
        });
      }
    }

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

    revalidateProjectContent(manga_slug);
    revalidateProjectChapter(existingChapter.manga_slug, existingChapter.chapter_number);
    revalidateProjectChapter(manga_slug, data.chapter_number);

    return NextResponse.json({ data });
  } catch (err: unknown) {
    return adminErrorResponse(err, "Gagal update data chapter.");
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
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

    revalidateProjectContent(chapter.manga_slug);
    revalidateProjectChapter(chapter.manga_slug, chapter.chapter_number);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return adminErrorResponse(err, "Gagal menghapus data chapter.");
  }
}
