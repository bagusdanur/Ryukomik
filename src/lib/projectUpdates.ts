import { fetchContentJson } from "@/lib/contentApi";
import type { UpdateItem } from "@/types/content";

type ProjectUpdatesResponse = {
  data?: UpdateItem[];
};

export async function getProjectUpdates(): Promise<UpdateItem[]> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://ryukomik.my.id";

  try {
    const response = await fetchContentJson<ProjectUpdatesResponse>(
      `${siteUrl}/api/project/pustaka?page=1&limit=12`,
      { revalidate: 600 },
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("getProjectUpdates error:", error);
    return [];
  }
}
