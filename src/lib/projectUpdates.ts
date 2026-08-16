import { fetchContentJson } from "@/lib/contentApi";
import type { UpdateItem } from "@/types/content";

type ProjectUpdatesResponse = {
  data?: UpdateItem[];
};

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
        ? json.data.map((item) => ({
            ...item,
            image: item.image || (item as UpdateItem & { cover_url?: string }).cover_url,
          }))
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
