import { NextResponse } from "next/server";
import { getPublicAdsConfig } from "@/lib/adsSettings";

export const dynamic = "force-dynamic";

/** Endpoint publik — hanya data minimal yang dibutuhkan loader iklan. */
export async function GET() {
  try {
    const config = await getPublicAdsConfig();
    const response = NextResponse.json(config);
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    return response;
  } catch {
    return NextResponse.json({ masterEnabled: false, providers: [] }, { status: 200 });
  }
}
