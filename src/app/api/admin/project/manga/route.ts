import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { revalidatePath, revalidateTag } from "next/cache";
import { deleteR2Prefix } from "@/lib/r2Storage";
import { verifyAdminRequest, adminErrorResponse } from "@/lib/adminApi";
import { enqueueProjectDiscordEvent } from "@/lib/projectDiscordEvents";
import { projectApiFetch, projectApiUrl } from "@/lib/projectApiServer";

function revalidateProjectContent(slug?: string) {
  revalidateTag("source-project-pustaka", { expire: 0 });
  revalidateTag("home-banner", { expire: 0 });
  revalidatePath("/", "page");
  revalidatePath("/api/project/pustaka", "page");
  if (slug) {
    revalidateTag(`project-detail:${slug}`, { expire: 0 });
    revalidatePath(`/komik/project/${slug}`, "page");
  }
}

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    const projectUrl = projectApiUrl(`/admin/projects?page=${page}&limit=${limit}`);
    if (projectUrl) {
      return NextResponse.json(await projectApiFetch(`/admin/projects?page=${page}&limit=${limit}`));
    }

    const { data, count, error } = await supabaseAdmin
      .from("project_manga")
      .select("id, slug, title, cover_url, description, type, status, author, genres, is_published, is_spotlight, view_count, created_at, updated_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ data, total: count || 0 });
  } catch (err: unknown) {
    return adminErrorResponse(err, "Gagal mengambil data manga.");
  }
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = await request.json();
    if (projectApiUrl("/admin/projects")) {
      const result = await projectApiFetch<{data:{slug:string}}>("/admin/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      revalidateProjectContent(result.data.slug); return NextResponse.json(result, { status: 201 });
    }
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

    revalidateProjectContent(slug);
    return NextResponse.json({ data });
  } catch (err: unknown) {
    return adminErrorResponse(err, "Gagal menambah data manga.");
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = await request.json();
    const { id, slug, title, cover_url, description, author, status, type, genres, is_published, is_spotlight } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    if (projectApiUrl(`/admin/projects/${id}`)) {
      const existing = await projectApiFetch<{data:any}>(`/admin/projects/${id}`);
      const result = await projectApiFetch<{data:any}>(`/admin/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!existing.data.is_published && result.data.is_published) await enqueueProjectDiscordEvent("project_published", result.data);
      else if (existing.data.is_published && result.data.is_published && status !== existing.data.status && ["dropped","cancelled"].includes(status || "")) await enqueueProjectDiscordEvent("project_status_changed", result.data, { previous_status: existing.data.status || "", status });
      revalidateProjectContent(existing.data.slug); revalidateProjectContent(result.data.slug); return NextResponse.json(result);
    }

    const update = Object.fromEntries(
      Object.entries({ slug, title, cover_url, description, author, status, type, genres, is_published, is_spotlight })
        .filter(([, value]) => value !== undefined),
    );

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan untuk disimpan" }, { status: 400 });
    }

    const { data: existingManga, error: existingMangaError } = await supabaseAdmin
      .from("project_manga")
      .select("slug,title,cover_url,type,status,genres,is_published,is_spotlight")
      .eq("id", id)
      .single();

    if (existingMangaError) throw existingMangaError;

    const { data, error } = await supabaseAdmin
      .from("project_manga")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    const wasPublished = existingManga.is_published === true;
    const isPublished = data.is_published === true;
    if (!wasPublished && isPublished) {
      await enqueueProjectDiscordEvent("project_published", data);
    } else if (
      wasPublished && isPublished &&
      typeof status === "string" &&
      status !== existingManga.status &&
      ["dropped", "cancelled"].includes(status)
    ) {
      await enqueueProjectDiscordEvent("project_status_changed", data, {
        previous_status: existingManga.status || "",
        status,
      });
    }

    revalidateProjectContent(existingManga.slug);
    if (slug && slug !== existingManga.slug) {
      revalidateProjectContent(slug);
    }

    // Revalidate banner when spotlight status changes
    if (is_spotlight !== undefined && existingManga.is_spotlight !== data.is_spotlight) {
      revalidatePath("/", "page");
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    return adminErrorResponse(err, "Gagal update data manga.");
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
    if (projectApiUrl(`/admin/projects/${id}`)) {
      const existing = await projectApiFetch<{data:{slug:string}}>(`/admin/projects/${id}`);
      const chapters = await projectApiFetch<{data:Array<{chapter_number:number}>}>(`/admin/chapters?manga_slug=${encodeURIComponent(existing.data.slug)}`);
      await Promise.all([deleteR2Prefix(`covers/${existing.data.slug}/`), ...chapters.data.map((ch) => deleteR2Prefix(`chapters/${existing.data.slug}/${ch.chapter_number}/`))]);
      await projectApiFetch(`/admin/projects/${id}`, { method: "DELETE" }); revalidateProjectContent(existing.data.slug);
      return NextResponse.json({ success: true, deletedChapters: chapters.data.length });
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

    revalidateProjectContent(mangaSlug);
    return NextResponse.json({ success: true, deletedChapters: chapters?.length || 0 });
  } catch (err: unknown) {
    return adminErrorResponse(err, "Gagal menghapus data manga.");
  }
}
