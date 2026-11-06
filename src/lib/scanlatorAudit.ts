import { socialQuery } from "@/lib/social/db";

export type RevisionAction = "create" | "edit_pages" | "edit_title" | "approve" | "reject" | "delete";

/**
 * Catat perubahan chapter untuk audit. Best-effort: kegagalan tidak boleh
 * menggagalkan aksi utama.
 */
export async function logChapterRevision(input: {
  chapterId: string;
  mangaSlug: string;
  actorId: string;
  action: RevisionAction;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  try {
    await socialQuery(
      `insert into scanlator_chapter_revisions (chapter_id, manga_slug, actor_id, action, before, after)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        input.chapterId,
        input.mangaSlug,
        input.actorId,
        input.action,
        input.before === undefined ? null : JSON.stringify(input.before),
        input.after === undefined ? null : JSON.stringify(input.after),
      ],
    );
  } catch (error) {
    console.error("[scanlator-audit] gagal mencatat revisi:", error instanceof Error ? error.message : error);
  }
}

/** Ringkasan singkat isi chapter (tanpa menyimpan seluruh URL berulang). */
export function revisionSnapshot(chapter: Record<string, unknown>) {
  const images = Array.isArray(chapter.image_urls) ? (chapter.image_urls as string[]) : [];
  return {
    title: (chapter.title as string | null) || null,
    chapter_number: Number(chapter.chapter_number || 0),
    pages: images.length,
    first_page: images[0] || null,
    last_page: images[images.length - 1] || null,
  };
}
