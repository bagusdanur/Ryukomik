import { socialDatabaseHealth } from "@/lib/social/db";
import { socialError, socialJson } from "@/lib/social/http";
import { requireModerator } from "@/lib/social/moderator";

export async function GET(request: Request) {
  try {
    await requireModerator(request);
    return socialJson(await socialDatabaseHealth(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return socialError(error);
  }
}
