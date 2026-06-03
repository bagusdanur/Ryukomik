import { NextResponse } from "next/server";
import { getTitleRushEventStatus } from "@/lib/titleRushEvent";

export async function GET() {
  const status = await getTitleRushEventStatus();

  return NextResponse.json(
    {
      enabled: status.enabled,
      updated_at: status.updated_at || null,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
      },
    },
  );
}
