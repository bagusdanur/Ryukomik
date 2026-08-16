import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { projectApiFetch } from "@/lib/projectApiServer";

export const dynamic = "force-dynamic";

function hasValidToken(request: NextRequest) {
  const configured = process.env.PROJECT_DISCORD_EVENTS_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!configured || !supplied) return false;
  const expectedBuffer = Buffer.from(configured);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function GET(request: NextRequest) {
  if (!hasValidToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawAfter = Number(request.nextUrl.searchParams.get("after") || "0");
  const after = Number.isSafeInteger(rawAfter) && rawAfter >= 0 ? rawAfter : 0;
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") || "25");
  const limit = Math.max(1, Math.min(Number.isSafeInteger(rawLimit) ? rawLimit : 25, 50));
  const result = await projectApiFetch<{ data: unknown[] }>(`/admin/discord-events?after=${after}&limit=${limit}`);
  const response = NextResponse.json({ data: result.data || [] });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
