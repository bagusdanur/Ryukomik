import { fetchContentJson } from "@/lib/contentApi";
import type { UpdateItem } from "@/types/content";

type ProjectUpdatesResponse = {
  data?: UpdateItem[];
};

function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return "";
  const time = new Date(dateStr).getTime();
  if (!Number.isFinite(time)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return "Baru saja";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} minggu lalu`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bulan lalu`;
  return `${Math.floor(days / 365)} tahun lalu`;
}

export async function getProjectUpdates(): Promise<UpdateItem[]> {
  const projectApiUrl = process.env.PROJECT_API_URL?.replace(/\/$/, "");
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://ryukomik.my.id";

  try {
    if (projectApiUrl) {
      const response = await fetch(`${projectApiUrl}/projects?page=1&limit=12`, {
        next: { revalidate: 600, tags: ["source-project-pustaka"] },
      });
      if (!response.ok) throw new Error(`Project API failed with status ${response.status}`);
      const json = (await response.json()) as ProjectUpdatesResponse;
      return Array.isArray(json.data)
        ? json.data.map((item) => {
            const source = item as UpdateItem & { cover_url?: string; type?: string; latest_chapter?: number | string; latest_chapter_uploaded_at?: string };
            return {
              ...item,
              image: item.image || source.cover_url,
              type_genre: item.type_genre || source.type,
              chapter_terbaru: item.chapter_terbaru || (source.latest_chapter != null ? `Chapter ${source.latest_chapter}` : ""),
              info: item.info || formatRelativeDate(source.latest_chapter_uploaded_at),
            };
          })
        : [];
    }

    const response = await fetchContentJson<ProjectUpdatesResponse>(
      `${siteUrl}/api/project/pustaka?page=1&limit=12`,
      { revalidate: 600, tags: ["source-project-pustaka"] },
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("getProjectUpdates error:", error);
    return [];
  }
}
