import { socialError, socialJson } from "@/lib/social/http";
import { socialMetricSnapshot } from "@/lib/social/metrics";
import { requireModerator } from "@/lib/social/moderator";

export async function GET(request: Request) {
  try {
    await requireModerator(request);
    const items = socialMetricSnapshot();
    const totalBytes = items.reduce((sum, item) => sum + item.bytes, 0);
    const projectedMonthlyBytes = totalBytes * 30;
    const quota = 5 * 1024 * 1024 * 1024;
    return socialJson({ items, totalBytes, projectedMonthlyBytes, quotaRatio: projectedMonthlyBytes / quota }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return socialJson({ error: "Akses moderator diperlukan." }, { status: 403 });
    return socialError(error);
  }
}
