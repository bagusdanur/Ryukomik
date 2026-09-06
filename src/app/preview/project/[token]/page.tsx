import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { verifyDraftPreviewToken } from "@/lib/draftPreviewToken";
import { projectApiFetch } from "@/lib/projectApiServer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preview Draft Chapter | Ryukomik",
  robots: { index: false, follow: false, noarchive: true, noimageindex: true },
};

type DraftChapter = {
  id: string;
  manga_slug: string;
  chapter_number: number;
  title?: string | null;
  image_urls?: string[] | null;
  is_published: boolean;
};

export default async function DraftPreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = verifyDraftPreviewToken(token);
  if (!payload) notFound();

  const result = await projectApiFetch<{ data: DraftChapter }>(
    `/admin/chapters/${encodeURIComponent(payload.chapterId)}`,
    { cache: "no-store" },
  ).catch(() => null);
  const chapter = result?.data;
  if (!chapter || chapter.is_published) notFound();

  const images = Array.isArray(chapter.image_urls) ? chapter.image_urls : [];
  const expiresAt = new Date(payload.expiresAt * 1000);

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-20 border-b border-amber-300/20 bg-black/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Preview draft privat</p>
            <h1 className="truncate text-sm font-black sm:text-base">
              {chapter.manga_slug.replace(/-/g, " ")} · Chapter {chapter.chapter_number}
            </h1>
            {chapter.title && <p className="truncate text-xs text-white/50">{chapter.title}</p>}
          </div>
          <div className="shrink-0 text-right text-[10px] text-white/45">
            <p>{images.length} halaman</p>
            <p>Kedaluwarsa {expiresAt.toLocaleDateString("id-ID")}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl">
        {images.map((url, index) => (
          <img
            key={`${url}:${index}`}
            src={url}
            alt={`Halaman ${index + 1}`}
            className="block h-auto w-full"
            loading={index < 2 ? "eager" : "lazy"}
            referrerPolicy="no-referrer"
          />
        ))}
        {!images.length && (
          <p className="p-12 text-center text-sm text-white/50">Draft ini belum memiliki gambar.</p>
        )}
      </div>
    </main>
  );
}
