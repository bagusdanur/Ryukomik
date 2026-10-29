import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { listAwardedTitleRushWinners } from "@/lib/social/titleRushStore";
import { getXpLeadersCached } from "@/lib/profileServerCache";

const getCommentBadges = unstable_cache(
  async () => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [titleRushWinnerRows, xpLeaders] = await Promise.all([
      listAwardedTitleRushWinners(since, undefined, 3),
      getXpLeadersCached(3),
    ]);
    const titleRushWinners = titleRushWinnerRows;

    return {
      titleRushWinners: titleRushWinners || [],
      xpLeaders: xpLeaders || [],
    };
  },
  ["comment-badges"],
  { revalidate: 600, tags: ["comment-badges"] },
);

export async function GET() {
  const data = await getCommentBadges();
  const response = NextResponse.json(data);
  response.headers.set("Cache-Control", "public, s-maxage=600, stale-while-revalidate=600");
  return response;
}
